"""Public retailer observations. No login, OCR price guesses, images or tracking links.

CU's absent robots file (404) means no published robots directives; explicit
denials and unavailable/malformed policies stop collection. Other unsupported
retailers remain official-link guides, never fabricated price listings.
"""
from datetime import datetime, timezone
from hashlib import sha256
from html import unescape
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse, unquote
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError
from urllib.robotparser import RobotFileParser
import json
import re
import time

OUT = Path(__file__).resolve().parent.parent / 'marketbot-data/retail-promotions.json'
UA = 'MarketBot/1.0 (+https://dropped.kr/about)'
CU = 'https://cu.bgfretail.com'
LOTTE = 'https://company.lottemart.com/mobiledowa/event/event_list.asp'
HOMEPLUS = 'https://my.homeplus.co.kr'

def robots_allowed(policy, user_agent, url):
    """RFC9309 longest matching rule; stdlib's first-match can allow /api/.

    Never borrow another crawler's explicit permissions. Combine equally specific
    groups; a longer disallow beats Allow:/, and allow wins only equal-length ties.
    """
    groups=[];agents=[];rules=[];directives=False
    for raw in policy.splitlines():
        line=raw.split('#',1)[0].strip()
        if ':' not in line: continue
        key,value=(s.strip() for s in line.split(':',1));key=key.lower()
        if key=='user-agent':
            if directives:
                groups.append((agents,rules));agents=[];rules=[];directives=False
            agents.append(value.lower())
        elif agents:
            directives=True
            if key in ('allow','disallow') and value:rules.append((key,value))
    if agents:groups.append((agents,rules))
    token=user_agent.split('/',1)[0].lower();matches=[]
    for names,entries in groups:
        lengths=[0 if name=='*' else len(name) for name in names if name=='*' or name in token]
        if lengths:matches.append((max(lengths),entries))
    if not matches:return True
    best=max(m[0] for m in matches);parsed=urlparse(url);target=unquote(parsed.path+('?' + parsed.query if parsed.query else ''))
    choices=[]
    for length,entries in matches:
        if length!=best:continue
        for kind,value in entries:
            value=unquote(value);end=value.endswith('$');pattern=re.escape(value[:-1] if end else value).replace(r'\*','.*')
            if re.match('^'+pattern+('$' if end else ''),target):choices.append((len(value.rstrip('$').replace('*','')),kind=='allow'))
    return max(choices)[1] if choices else True

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class PublicReader:
    def __init__(self):
        self.policies = {}
        self.policy_text = {}
        self.last = 0
        self.opener = build_opener(NoRedirect)

    def raw(self, url, body=None):
        delay = 10 if urlparse(url).netloc == 'www.gsretail.com' else 0.7
        time.sleep(max(0, delay - (time.monotonic() - self.last)))
        self.last = time.monotonic()
        req = Request(url, data=body, headers={'User-Agent': UA, 'Accept': 'text/plain' if urlparse(url).path == '/robots.txt' else 'application/json' if '/digital/getLft' in url else 'text/html',
            **({'Content-Type': 'application/x-www-form-urlencoded'} if body else {})})
        with self.opener.open(req, timeout=15) as response:
            return response.read(1_500_000).decode('utf-8-sig', errors='replace')

    def get(self, url, body=None):
        parsed = urlparse(url)
        if parsed.scheme != 'https' or parsed.netloc not in {'cu.bgfretail.com', 'company.lottemart.com', 'my.homeplus.co.kr', 'www.shinsegaegroupnewsroom.com', 'www.gsretail.com'}:
            raise ValueError('unapproved retailer origin')
        origin = parsed.scheme + '://' + parsed.netloc
        if origin not in self.policies:
            parser = RobotFileParser(origin + '/robots.txt')
            try:
                # Robots may redirect to the merchant's own missing-file page.
                # Follow only same-origin policy redirects; never content/auth
                # redirects, and never retry a denial or rate-limit response.
                policy_url = origin + '/robots.txt'
                for attempt in range(6):
                    try:
                        rules = self.raw(policy_url)
                        break
                    except HTTPError as redirect:
                        target = urljoin(policy_url, redirect.headers.get('Location', ''))
                        if redirect.code not in (301, 302, 303, 307, 308) or not redirect.headers.get('Location') or attempt == 5 or urlparse(target).scheme + '://' + urlparse(target).netloc != origin:
                            raise
                        policy_url = target
                if rules.lstrip().startswith('<') or 'user-agent:' not in rules.lower():
                    raise ValueError('retailer policy unavailable')
                parser.parse(rules.splitlines())
            except HTTPError as exc:
                # RFC 9309 2.3.1.3: a missing/unavailable robots resource is
                # different from a denied content request. Keep explicit access,
                # proxy and rate-limit refusals closed; no UA impersonation.
                if exc.code not in (400, 404, 410):
                    raise
                parser.parse(['User-agent: *', 'Allow: /'])
            self.policies[origin] = parser
            self.policy_text[origin] = rules if 'rules' in locals() else 'User-agent: *\nAllow: /'
        allowed = robots_allowed(self.policy_text[origin],UA,url) if origin in self.policy_text else self.policies[origin].can_fetch(UA,url)
        if not allowed:
            raise ValueError('retailer policy denies this path')
        return self.raw(url, body)

def text(value):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', value))).strip()

def category(name):
    if re.search(r'콜라|사이다|커피|티\d|우유|워터|음료|주스|환타|스프라이트|헛개수|몬스터|핫식스', name):
        return '음료'
    if re.search(r'세제|샴푸|칫솔|치약|휴지|비누|면도|마스크|물티슈', name):
        return '생활용품'
    if re.search(r'과자|쿠키|초코|캔디|멘토스|껌|젤리|파인트|아이스|콘\b|팝콘', name):
        return '과자·디저트'
    return '식품·기타'

def product_image(value, retailer):
    value = 'https:' + value if value.startswith('//') else value
    pattern = (r'https://tqklhszfkvzk6518638\.edge\.naverncp\.com/product/\d{13}(?:_\d+)?\.(?:png|jpg|jpeg)' if retailer == 'cu'
               else r'https://image\.homeplus\.kr/it/\d+[a-zA-Z0-9]*')
    return value if re.fullmatch(pattern, value) else None

def parse_cu_list(html):
    rows = []
    for block in re.findall(r'<li\b[^>]*class=["\'][^"\']*\bprod_list\b[^"\']*["\'][^>]*>([\s\S]*?)</li>', html, re.I):
        ident = re.search(r'javascript:view\((\d+)\)', block)
        name = re.search(r'<div\b[^>]*class=["\']name["\'][^>]*>([\s\S]*?)</div>', block)
        price = re.search(r'<div\b[^>]*class=["\']price["\'][^>]*>[\s\S]*?<strong>([\d,]+)</strong>', block)
        # Do not match the example in the HTML comment.
        clean = re.sub(r'<!--[\s\S]*?-->', '', block)
        promo = re.search(r'<span\b[^>]*class=["\']plus([12])["\'][^>]*>\s*([12])\+1\s*</span>', clean)
        barcode = re.search(r'/product/(\d{13})\.(?:png|jpg|jpeg)', block, re.I)
        if not all((ident, name, price, promo)):
            continue
        amount = int(price[1].replace(',', ''))
        if amount <= 0:
            continue
        image = re.search(r'<img[^>]+src=["\']([^"\']+/product/[^"\']+)["\']', block, re.I)
        rows.append({'id': 'cu-' + ident[1], 'sourceId': ident[1], 'retailer': 'cu', 'kind': 'product',
            'imageUrl':product_image(image[1], 'cu') if image else None,
            'name': text(name[1]), 'category': category(text(name[1])), 'unitPrice': amount,
            'buyQuantity': int(promo[2]), 'giftQuantity': 1, 'promotion': promo[2] + '+1',
            'barcode': barcode[1] if barcode else None, 'startDate': None, 'endDate': None,
            'sourceUrl': CU + '/product/view.do?category=event&gdIdx=' + ident[1],
            'conditions': ['동일 상품으로 행사 수량을 구매하는 경우 계산', '교차 증정·점포별 적용·재고는 공식 안내 및 매장에서 확인'],
            'scope': 'CU 행사 목록 · 점포별 적용 확인'})
    return rows

def confirm_cu(row, html):
    name = re.search(r'<p\b[^>]*class=["\']tit["\'][^>]*>([\s\S]*?)</p>', html)
    price = re.search(r'<dd\b[^>]*class=["\']prodPrice["\'][^>]*>[\s\S]*?<span>([\d,]+)</span>', html)
    tags = re.search(r'<ul\b[^>]*class=["\']prodTag["\'][^>]*>([\s\S]*?)</ul>', html)
    return bool(name and price and tags and text(name[1]) == row['name'] and
                int(price[1].replace(',', '')) == row['unitPrice'] and row['promotion'] in text(tags[1]))

def parse_homeplus(payload):
    rows = []
    data = payload.get('data', {}) or {}
    for item in data.get('goodsList', []) or []:
        ident = str(item.get('goodsId', ''))
        name = text(str(item.get('goodsNm', '')))
        tags = ' · '.join(text(str(t.get('tagNm', ''))) for t in item.get('tags', []))
        price = str(item.get('price', '')).replace(',', '')
        start, end = str(item.get('startTime', '')), str(item.get('endTime', ''))
        if not ident.isdigit() or not name or '\ufffd' in name or not price.isdigit() or int(price) < 1:
            continue
        if not re.fullmatch(r'20\d{6} \d{2}:\d{2}:\d{2}', start) or not re.fullmatch(r'20\d{6} \d{2}:\d{2}:\d{2}', end):
            continue
        try:
            start_date = datetime.strptime(start, '%Y%m%d %H:%M:%S').date().isoformat()
            end_date = datetime.strptime(end, '%Y%m%d %H:%M:%S').date().isoformat()
        except ValueError:
            continue
        if start_date > end_date or re.search(r'주류|소주|맥주|와인|위스키|담배', name):
            continue
        if ident == '2645' and start_date == '2026-10-15' and end_date == '2026-10-21':
            # Public digital and printed leaflet prices disagree. Do not refresh
            # this record as a validated price until the original is corrected.
            continue
        promo = '1+1' if '1+1' in tags else '2+1' if '2+1' in tags else '멤버특가' if '멤버특가' in tags else '전단가'
        original = str(item.get('origPrice', '')).replace(',', '')
        original = int(original) if original.isdigit() and int(original) > int(price) and promo not in ('1+1','2+1') else None
        # Complex multi-buy/coupon-only totals need a different, explicit contract.
        if re.search(r'교차|골라|쿠폰|\d+개.*(?:구매|할인|원)', tags) and promo not in ('1+1','2+1'):
            continue
        rows.append({'id':'homeplus-'+ident,'sourceId':ident,'retailer':'homeplus','kind':'product',
            'imageUrl':product_image(str(item.get('goodsImgUrl') or ''), 'homeplus'),
            'merchantOriginalPrice':original,
            'name':name,'category':category(name),'unitPrice':int(price),'buyQuantity':2 if promo=='2+1' else 1,
            'giftQuantity':1 if promo in ('1+1','2+1') else 0,'promotion':promo,'barcode':None,
            'startDate':start_date,'endDate':end_date,'sourceUrl':HOMEPLUS+'/lft/prd_view?id='+ident,
            'conditions': ['마이홈플러스 멤버특가 표시는 회원 조건 적용' if '멤버특가' in tags else '공식 디지털 전단의 판매 단위와 행사 조건 적용',
                '상품명에 표시된 용량·묶음·판매 단위 기준이며, 취급 점포·재고·온오프라인 적용이 다를 수 있습니다',
                '판매처 표시 기준가·할인액은 전단의 표시 금액이며, 실제 관측한 과거 가격 이력과 구분합니다'],
            'scope':'홈플러스 공식 디지털 전단 · 취급 점포에 한함', 'priceLabel':'회원 조건 적용' if '멤버특가' in tags else '전단 판매 단위 기준'})
    return rows

def confirm_homeplus(row, html):
    name = re.search(r'<h2[^>]*class=["\']prd__name["\'][^>]*>([\s\S]*?)</h2>', html)
    price = re.search(r'<span[^>]*class=["\']prd__(?:discount|price)["\'][^>]*>\s*<strong>([\d,]+)</strong>', html)
    period = re.search(r'class=["\']prd__promotion-date["\'][^>]*>([\s\S]*?)</div>', html)
    if not name or not price or not period or text(name[1]) != row['name'] or int(price[1].replace(',','')) != row['unitPrice']:
        return False
    if row.get('merchantOriginalPrice'):
        original = re.search(r'<del[^>]*class=["\']prd__price["\'][^>]*>\s*([\d,]+)', html)
        if not original or int(original[1].replace(',','')) != row['merchantOriginalPrice']:
            return False
    dates = re.findall(r'(\d{1,2})\.\s*(\d{1,2})\.', text(period[1]))
    expected = [(str(int(d[5:7])),str(int(d[8:10]))) for d in (row['startDate'],row['endDate'])]
    if [(str(int(a)),str(int(b))) for a,b in dates] != expected:
        return False
    return (row['promotion'] not in ('1+1','2+1','멤버특가') or row['promotion'] in text(html[html.find('class="prd__name"')-1000:html.find('class="prd__name"')+2000]))

def parse_lotte(html):
    rows = []
    for href, block in re.findall(r'<a\s+href=["\']([^"\']*event_view\.asp[^"\']+)["\'][^>]*>([\s\S]*?)</a>', html, re.I):
        title = re.search(r'<div\b[^>]*class=["\']tit["\'][^>]*>([\s\S]*?)</div>', block)
        period = re.search(r'(20\d{2}-\d{2}-\d{2})[\s\S]*?~[\s\S]*?(20\d{2}-\d{2}-\d{2})', block)
        ident = re.search(r'event_banner_id=(\d+)', href)
        if not title or not period or not ident:
            continue
        name = text(title[1])
        if re.search(r'당첨자|기부제|PLCC|삼성카드', name):
            continue
        name = re.sub(r'^\d{6}_?(?:\d{4}_)?', '', name).replace('_', ' ').strip()
        rows.append({'id': 'lotte-' + ident[1], 'sourceId': ident[1], 'retailer': 'lotte', 'kind': 'event',
            'name': name, 'category': '행사 안내', 'promotion': '행사 안내', 'unitPrice': None,
            'buyQuantity': None, 'giftQuantity': None, 'barcode': None,
            'startDate': period[1], 'endDate': period[2], 'sourceUrl': LOTTE,
            'conditions': ['가격·혜택·참여 대상은 공식 행사 안내에서 확인', '행사 안내이며 상품별 최저가 판정이 아닙니다'],
            'scope': '롯데마트 공식 이벤트 안내 · 적용 대상 원문 확인'})
    return rows

def revision(row):
    fields = {key: row.get(key) for key in ('name', 'unitPrice', 'buyQuantity', 'giftQuantity', 'promotion', 'startDate', 'endDate', 'conditions')}
    if row.get('priceKind'):
        fields['priceKind'] = row['priceKind']
    return sha256(json.dumps(fields, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]

def merge_catalog(old, collected, statuses, now):
    offers = {row['id']: dict(row) for row in old.get('offers', [])}
    day = now[:10]
    for raw in collected:
        row = dict(raw)
        previous = offers.get(row['id'], {})
        history = list(previous.get('history', []))
        rev = revision(row)
        observation = {'checkedAt': now, 'revision': rev, **{key: row.get(key) for key in
            ('name', 'barcode', 'unitPrice', 'buyQuantity', 'giftQuantity', 'promotion', 'priceKind', 'startDate', 'endDate')}}
        if history and history[-1]['revision'] == rev and history[-1]['checkedAt'][:10] == day:
            history[-1] = observation
        else:
            history.append(observation)
        offers[row['id']] = {**row, 'firstSeenAt': previous.get('firstSeenAt', now), 'lastSeenAt': now,
            'revision': rev, 'history': history[-180:]}
    return {'schemaVersion': 1, 'checkedAt': now, 'sources': {**old.get('sources', {}), **statuses},
            'offers': sorted(offers.values(), key=lambda row: row['id'])}

def collect_cu(reader, old, now, budget_seconds=900):
    candidates, pages, complete, mismatches = {}, {}, True, 0
    deadline = time.monotonic() + budget_seconds
    try:
        for condition in ('23', '24'):
            seen = set()
            pages[condition] = 0
            for page in range(1, 201):
                body = urlencode({'pageIndex':page,'listType':0,'searchCondition':condition}).encode()
                html = reader.get(CU+'/event/plusAjax.do',body)
                first = parse_cu_list(html)
                if not first:
                    complete = False  # An empty/error response is not proof that pagination ended.
                    break
                ids = {r['id'] for r in first}
                if not ids - seen:
                    complete = False  # Ignored page parameter/repeated page is not an end marker.
                    break
                seen.update(ids)
                pages[condition] += 1
                second = {r['id']:r for r in parse_cu_list(reader.get(CU+'/event/plusAjax.do',body))}
                for row in first:
                    if second.get(row['id']) == row: candidates[row['id']] = row
                    else: mismatches += 1
                if set(second) != ids: complete = False
                if not re.search(r'javascript:nextPage\(',html): break
            else:
                complete = False  # Safety stop, explicitly partial; never report all pages collected.
        if not candidates: raise ValueError('CU official list has no stable verified candidates')
        previous = {r['id']:r for r in old.get('offers',[]) if r.get('retailer')=='cu'}
        verified, reused, consecutive_errors, deferred = [], 0, 0, 0
        fields = ('name','unitPrice','buyQuantity','giftQuantity','promotion','barcode')
        def prior_detail(row):
            prior = previous.get(row['id'], {})
            detail_time = prior.get('detailVerifiedAt') or prior.get('lastSeenAt')
            try:
                age = (datetime.fromisoformat(now.replace('Z','+00:00'))-datetime.fromisoformat(detail_time.replace('Z','+00:00'))).total_seconds() if detail_time else -1
            except (TypeError, ValueError):
                age = -1
            reusable = 0 <= age < 86400 and all(prior.get(k)==row.get(k) for k in fields)
            return detail_time, age, reusable
        # Reuse only unchanged, recently detail-verified rows. Then prioritize
        # unverified/oldest details, so saved partial work advances next run.
        ordered = sorted(candidates.values(), key=lambda row:
            (0 if prior_detail(row)[2] else 1,
             -prior_detail(row)[1] if prior_detail(row)[1] >= 0 else float('-inf')))
        for index,row in enumerate(ordered):
            try:
                detail_time, age, reusable = prior_detail(row)
                if reusable:
                    row['detailVerifiedAt'] = detail_time
                    reused += 1
                elif time.monotonic() >= deadline:
                    deferred += 1
                    continue
                elif confirm_cu(row,reader.get(row['sourceUrl'])):
                    row['detailVerifiedAt'] = datetime.now(timezone.utc).isoformat()
                else: continue
                verified.append(row)
                consecutive_errors = 0
            except Exception:
                consecutive_errors += 1
                if consecutive_errors >= 5: break
                continue
            if (index+1)%100==0:
                print(json.dumps({'source':'cu','progress':index+1,'candidates':len(candidates),'verified':len(verified)}),flush=True)
        state={'status':'verified' if complete and not mismatches and len(verified)==len(candidates) else 'partial',
               'checkedAt':now,'count':len(verified),'discovered':len(candidates),'notConfirmed':len(candidates)-len(verified),
               'listPages':pages,'paginationComplete':complete,'unstableRows':mismatches,'detailReuseCount':reused,
               'detailDeferredCount':deferred,'stopReason':'time_budget' if deferred else None,
               'scope':'official_1plus1_2plus1','coverage':'all_available_list_pages' if complete else 'incomplete_list_pages',
               'periodPrecision':'not_provided'}
        return verified,state
    except Exception as exc:
        return [],{'status':'unavailable','attemptedAt':now,'count':0,'paginationComplete':False,'reason':type(exc).__name__}

def collect_homeplus(reader, now):
    products, seen_pages, excluded = {}, set(), 0
    requested, complete = 0, False
    try:
        for _ in range(200):
            payload=json.loads(reader.get(HOMEPLUS+'/digital/getLftMainGoods',urlencode({'sortBy':'P','page':requested}).encode()))
            if payload.get('success') is False and payload.get('errCode')==2001:
                return [],{'status':'source_preparing','attemptedAt':now,'count':0,'paginationComplete':False,'reason':'official_goods_preparing_2001','coverage':'official_digital_leaflet'}
            data=payload.get('data')
            if not isinstance(data,dict) or not isinstance(data.get('goodsList'),list):
                raise ValueError('Homeplus list contract unavailable')
            current,total=data.get('cpage'),data.get('tpage')
            if not str(current).isdigit() or not str(total).isdigit():
                raise ValueError('Homeplus pagination metadata unavailable')
            current,total=int(current),int(total)
            if current in seen_pages:break
            seen_pages.add(current)
            first=parse_homeplus(payload)
            second_payload=json.loads(reader.get(HOMEPLUS+'/digital/getLftMainGoods',urlencode({'sortBy':'P','page':requested}).encode()))
            second={r['id']:r for r in parse_homeplus(second_payload)}
            excluded+=len(data['goodsList'])-len(first)
            for row in first:
                if second.get(row['id'])==row:products[row['id']]=row
                else:excluded+=1
            if current>=total:
                complete=True;break
            requested=current+1  # The official page uses cpage+1; page=0 can alias page 1.
        verified=[];errors=0
        for row in products.values():
            try:
                if confirm_homeplus(row,reader.get(row['sourceUrl'])):verified.append(row)
                errors=0
            except Exception:
                errors+=1
                if errors>=5:break
        return verified,{'status':'verified' if complete and not excluded and len(verified)==len(products) else 'partial',
            'checkedAt':now,'count':len(verified),'discovered':len(products),'notConfirmed':len(products)-len(verified),
            'excludedFromPublication':excluded,'paginationComplete':complete,'listPages':len(seen_pages),
            'coverage':'all_available_digital_leaflet_pages' if complete else 'incomplete_list_pages'}
    except Exception as exc:
        return [],{'status':'unavailable','attemptedAt':now,'count':0,'paginationComplete':False,'reason':type(exc).__name__}

def collect(reader, old):
    now = datetime.now(timezone.utc).isoformat()
    rows, statuses = [], {}
    cu_rows,statuses['cu']=collect_cu(reader,old,now)
    rows.extend(cu_rows)
    try:
        events = parse_lotte(reader.get(LOTTE))
        if not events:
            raise ValueError('Lotte official list has no parsable event')
        # Some event details require the retailer's app/login. Do not access
        # those paths; publish only names and periods visible on the public list,
        # confirmed by a separate read. Never infer the hidden benefit/price.
        second = {row['id']: row for row in parse_lotte(reader.get(LOTTE))}
        verified = [row for row in events if second.get(row['id']) == row]
        if not verified:
            raise ValueError('Lotte detail dates were not confirmed')
        rows += verified
        statuses['lotte'] = {'status':'verified','checkedAt':now,'count':len(verified)}
    except Exception as exc:
        statuses['lotte'] = {'status':'unavailable','attemptedAt':now,'reason':type(exc).__name__}
    home_rows,statuses['homeplus']=collect_homeplus(reader,now)
    rows.extend(home_rows)
    from collect_more_retail import collect_more
    additional, source_status = collect_more(reader, text, now)
    rows.extend(additional)
    statuses.update(source_status)
    return merge_catalog(old, rows, statuses, now)

def main():
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--retailer',choices=['all','lotte','cu','homeplus','coverage'],default='all');parser.add_argument('--output',type=Path,default=OUT);args=parser.parse_args()
    if args.retailer == 'lotte':
        from collect_more_retail import collect_lotte
        now=datetime.now(timezone.utc).isoformat();rows,status=collect_lotte(PublicReader(),text,now)
        result=merge_catalog(old,rows,{'lotte':status},now)
    elif args.retailer=='cu':
        now=datetime.now(timezone.utc).isoformat();rows,status=collect_cu(PublicReader(),old,now)
        result=merge_catalog(old,rows,{'cu':status},now)
    elif args.retailer=='coverage':
        from collect_more_retail import collect_source_coverage
        now=datetime.now(timezone.utc).isoformat();result=merge_catalog(old,[],collect_source_coverage(PublicReader(),now),now)
    elif args.retailer=='homeplus':
        now=datetime.now(timezone.utc).isoformat();rows,status=collect_homeplus(PublicReader(),now)
        result=merge_catalog(old,rows,{'homeplus':status},now)
    else:
        result = collect(PublicReader(), old)
    args.output.parent.mkdir(exist_ok=True,parents=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(json.dumps({'offers':len(result['offers']), 'sources':result['sources']},ensure_ascii=False))
    source=args.retailer if args.retailer in ('lotte','cu','homeplus') else 'cu'
    if args.retailer != 'coverage' and result['sources'].get(source, {}).get('status') == 'unavailable':
        raise SystemExit(source+' observations unavailable; retained history is not a successful refresh')

if __name__ == '__main__':
    main()
