"""Official press prices and store lookup prices; never relabel them as discounts.

Costco terms section 17 excludes product aggregation/bots; GS Retail disallows
/api/. Neither is collected here. No blocked Emart app path is accessed.
"""
import json
import re
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlencode
from urllib.robotparser import RobotFileParser
from datetime import datetime, timezone, timedelta

RULES = Path(__file__).with_name('retail_official_price_rules.json')
NEWSROOM = 'https://www.shinsegaegroupnewsroom.com'
LOTTE_SEARCH = 'https://company.lottemart.com/mobiledowa/product/search_product.asp'

def inspect_gs25_policy(reader, now):
    origin='https://www.gsretail.com'
    state={'status':'crawl_path_restricted','attemptedAt':now,'count':0,'coverage':'not_connected','paginationComplete':False,
           'sourceUrl':origin+'/brand/gs25','policyUrl':origin+'/robots.txt'}
    try:
        policy=reader.raw(origin+'/robots.txt')
        if policy.lstrip().startswith('<') or 'user-agent:' not in policy.lower():
            raise ValueError('GS25 policy unavailable')
        parser=RobotFileParser(origin+'/robots.txt');parser.parse(policy.splitlines())
        state['policyCheckedAt']=now
        from collect_retail_promotions import robots_allowed, UA
        state['apiAllowed']=robots_allowed(policy,UA,origin+'/api/')
        state['crawlDelaySeconds']=parser.crawl_delay('MarketBot/1.0') or 10
        # Honor the published UTC visit window; don't read content outside it.
        match=re.search(r'^Visit-time:\s*(\d{4})\s*-\s*(\d{4})',policy,re.M|re.I)
        current=datetime.fromisoformat(now.replace('Z','+00:00')).astimezone(timezone.utc)
        if not match: raise ValueError('GS25 visit window must be reviewed')
        start,end=match.groups();hhmm=current.strftime('%H%M')
        state['visitWindowUtc']=start+'-'+end
        if not start<=hhmm<=end:
            next_day=current if hhmm<start else current+timedelta(days=1)
            state['nextEligibleAt']=next_day.replace(hour=int(start[:2]),minute=int(start[2:]),second=0,microsecond=0).isoformat()
            state['reason']='outside_official_visit_window_api_not_collected'
            return state
        reader.policies[origin]=parser
        reader.policy_text[origin]=policy
        # Only the public HTML page. Never request a disallowed product API.
        html=reader.get(origin+'/brand/gs25')
        state.update(status='public_html_unavailable',htmlCheckedAt=now,reason='public_html_has_no_verified_product_contract')
        state['publicHtmlBytes']=len(html.encode('utf-8'))
        return state
    except Exception as exc:
        state.update(status='policy_check_failed',reason=type(exc).__name__)
        return state

def collect_source_coverage(reader, now):
    return {'gs25':inspect_gs25_policy(reader,now),
      **{key:{'status':'limited_coverage','attemptedAt':now,'coverage':'selected_official_announcements',
        'paginationComplete':False,'discountFeedConnected':False if key in ('nobrand','traders') else None,
        'reason':'product_release_reference_only' if key in ('nobrand','traders') else 'selected_campaign_products_only'} for key in ('nobrand','traders','emart')}}

def parse_press(html, rule, clean):
    if rule['publishedDate'] not in html and rule['publishedDate'].replace('-','.') not in html:
        return []
    paragraphs = [clean(p) for p in re.findall(r'<p\b[^>]*>([\s\S]*?)</p>', html)]
    whole = ' '.join(paragraphs)
    if not all(token in whole for token in rule.get('periodEvidence', [])):
        return []
    rows = []
    for spec in rule['items']:
        if not any(all(token in p for token in spec['evidence']) for p in paragraphs):
            continue
        ident = str(int(sha256((rule['retailer']+'|'+spec['name']).encode()).hexdigest()[:12],16))
        reference = rule['priceKind'] == 'reference'
        rows.append({'id':rule['retailer']+'-'+ident,'sourceId':ident,'retailer':rule['retailer'],'kind':'product',
          'name':spec['name'],'category':spec.get('category','식품·기타'),'unitPrice':spec['price'],
          'buyQuantity':1,'giftQuantity':0,'promotion':'공식발표가' if reference else '공식행사가',
          'priceKind':rule['priceKind'],'barcode':None,
          'startDate':None if reference else rule['startDate'],'endDate':None if reference else rule['endDate'],
          'sourceUrl':NEWSROOM+'/'+rule['slug'], 'publishedDate':rule['publishedDate'],
          'priceLabel':rule['publishedDate']+' 발표가 · 현재가 미확인' if reference else spec['priceLabel'],
          'scope':rule['scope'], 'conditions':spec['conditions'] +
              (['출시 발표 가격의 참고 기록입니다. 할인·현재 판매가·재고를 확인한 가격이 아닙니다.'] if reference else ['공식 발표된 행사 조건 가격입니다. 실제 잔여 수량과 점포 적용은 별도 확인이 필요합니다.'])})
    return rows

def parse_lotte_lookup(html, clean, keyword):
    rows=[]
    for block in re.findall(r'<li>\s*<div class="prod-box">([\s\S]*?)</li>',html):
        name=re.search(r'class="prod-name">([\s\S]*?)</div>',block)
        size=re.search(r'class="prod-count">\s*<!--(\d{13})-->([\s\S]*?)</div>',block)
        price=re.search(r'<th>ㆍ가격\s*:\s*</th><td>([\d,]+)\s*원</td>',block)
        popup=re.search(r'class="layer-head">([\s\S]*?)</div>',block)
        if not name or not size or not price or not popup or clean(name[1]) != clean(popup[1]): continue
        spec=clean(size[2])
        # Start with explicitly specified multipacks; ambiguous POS sale units
        # such as a bare 240ML with a bundle price stay outside publication.
        if not re.search(r'(?:ML|G|KG|L|매|개|롤|입)\s*[*×xX]\s*[2-9]\d*\s*(?:입|개|팩|롤)?(?:$|[^0-9])',spec,re.I): continue
        value=int(price[1].replace(',',''))
        if value<=0:continue
        barcode=size[1];ident='2200'+barcode
        rows.append({'id':'lotte-'+ident,'sourceId':ident,'retailer':'lotte','kind':'product',
          'name':clean(name[1])+' '+spec,'category':'식품·기타','unitPrice':value,'buyQuantity':1,'giftQuantity':0,
          'promotion':'점포조회가','priceKind':'reference','barcode':barcode,'startDate':None,'endDate':None,
          'sourceUrl':'https://company.lottemart.com/mobiledowa/',
          'priceLabel':'서울역점 조회가 · 할인 여부 미확인','scope':'롯데마트 제타플렉스 서울역점(2200) · 다른 점포에 일반화하지 않음',
          'conditions':['공식 점포 조회 가격의 참고 기록이며 할인·최저가 판정이 아닙니다.',
            '규격에 표시된 묶음 단위 가격입니다. 실제 가격·재고는 점포 판매 상황과 행사에 따라 달라질 수 있습니다.',
            '원문 재조회: 도와센터 상품 확인 → 서울 → 제타플렉스 서울역점 → '+clean(name[1])]})
        if len(rows)==4:break
    return rows

def collect_more(reader, clean, now):
    rows=[];statuses={
      'costco':{'status':'permission_required','attemptedAt':now,'reason':'terms_section_17_product_aggregation_and_bots'},
      'gs25':inspect_gs25_policy(reader,now)}
    for rule in json.loads(RULES.read_text(encoding='utf-8')):
        key=rule['retailer'];existing=statuses.get(key,{}).get('count',0)
        try:
            url=NEWSROOM+'/'+rule['slug']
            first=parse_press(reader.get(url),rule,clean)
            second={r['id']:r for r in parse_press(reader.get(url),rule,clean)}
            verified=[r for r in first if second.get(r['id'])==r]
            rows.extend(verified)
            statuses[key]={'status':'verified' if len(verified)==len(rule['items']) else 'partial','checkedAt':now,
                           'count':existing+len(verified),'referenceOnly':rule['priceKind']=='reference'}
        except Exception as exc:
            statuses[key]={'status':'partial' if existing else 'unavailable','attemptedAt':now,'count':existing,'reason':type(exc).__name__}
    for key in ('emart','nobrand','traders'):
        statuses.setdefault(key,{}).update(coverage='selected_official_announcements',paginationComplete=False,
            discountFeedConnected=key=='emart')
    additional, state = collect_lotte(reader, clean, now)
    rows.extend(additional); statuses['lotte'] = state
    return rows,statuses

def collect_lotte(reader, clean, now):
    try:
        verified={}
        for keyword in ('우유','라면','휴지'):
            body=urlencode({'p_area':'서울','p_market':'2200','p_schWord':keyword}).encode()
            first=parse_lotte_lookup(reader.get(LOTTE_SEARCH,body),clean,keyword)
            second={r['id']:r for r in parse_lotte_lookup(reader.get(LOTTE_SEARCH,body),clean,keyword)}
            for row in first:
                if second.get(row['id'])==row:verified[row['id']]=row
        return list(verified.values()), {'status':'verified' if verified else 'unavailable','checkedAt':now,'count':len(verified),'referenceOnly':True,'scope':'store_2200'}
    except Exception as exc:
        return [], {'status':'unavailable','attemptedAt':now,'reason':type(exc).__name__,'reasonDetail':str(getattr(exc,'reason',exc))[:180]}
