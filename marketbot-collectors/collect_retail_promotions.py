"""Public retailer observations. No login, OCR price guesses, images or tracking links.

CU's absent robots file (404) means no published robots directives; explicit
denials and unavailable/malformed policies stop collection. Other unsupported
retailers remain official-link guides, never fabricated price listings.
"""
from datetime import datetime, timezone
from hashlib import sha256
from html import unescape
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse
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

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class PublicReader:
    def __init__(self):
        self.policies = {}
        self.last = 0
        self.opener = build_opener(NoRedirect)

    def raw(self, url, body=None):
        time.sleep(max(0, 0.7 - (time.monotonic() - self.last)))
        self.last = time.monotonic()
        req = Request(url, data=body, headers={'User-Agent': UA, 'Accept': 'text/html',
            **({'Content-Type': 'application/x-www-form-urlencoded'} if body else {})})
        with self.opener.open(req, timeout=15) as response:
            return response.read(1_500_000).decode('utf-8-sig', errors='replace')

    def get(self, url, body=None):
        parsed = urlparse(url)
        if parsed.scheme != 'https' or parsed.netloc not in {'cu.bgfretail.com', 'company.lottemart.com'}:
            raise ValueError('unapproved retailer origin')
        origin = parsed.scheme + '://' + parsed.netloc
        if origin not in self.policies:
            parser = RobotFileParser(origin + '/robots.txt')
            try:
                rules = self.raw(origin + '/robots.txt')
                if rules.lstrip().startswith('<') or 'user-agent:' not in rules.lower():
                    raise ValueError('retailer policy unavailable')
                parser.parse(rules.splitlines())
            except HTTPError as exc:
                if exc.code != 404:
                    raise
                parser.parse(['User-agent: *', 'Allow: /'])
            self.policies[origin] = parser
        if not self.policies[origin].can_fetch(UA, url):
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
        rows.append({'id': 'cu-' + ident[1], 'sourceId': ident[1], 'retailer': 'cu', 'kind': 'product',
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
            ('name', 'barcode', 'unitPrice', 'buyQuantity', 'giftQuantity', 'promotion', 'startDate', 'endDate')}}
        if history and history[-1]['revision'] == rev and history[-1]['checkedAt'][:10] == day:
            history[-1] = observation
        else:
            history.append(observation)
        offers[row['id']] = {**row, 'firstSeenAt': previous.get('firstSeenAt', now), 'lastSeenAt': now,
            'revision': rev, 'history': history[-180:]}
    return {'schemaVersion': 1, 'checkedAt': now, 'sources': {**old.get('sources', {}), **statuses},
            'offers': sorted(offers.values(), key=lambda row: row['id'])}

def collect(reader, old):
    now = datetime.now(timezone.utc).isoformat()
    rows, statuses = [], {}
    cu = {}
    try:
        for condition in ('23', '24'):
            for page in range(1, 3):
                html = reader.get(CU + '/event/plusAjax.do', urlencode({'pageIndex':page,'listType':0,'searchCondition':condition}).encode())
                for row in parse_cu_list(html):
                    cu[row['id']] = row
        if not cu:
            raise ValueError('CU official list has no parsable promotion')
        verified = []
        for row in cu.values():
            try:
                if confirm_cu(row, reader.get(row['sourceUrl'])):
                    verified.append(row)
            except Exception:
                # A single unavailable detail must not discard other verified items.
                continue
        if not verified:
            raise ValueError('CU detail verification did not match')
        rows += verified
        statuses['cu'] = {'status':'verified' if len(verified) == len(cu) else 'partial', 'checkedAt':now,'count':len(verified),
                          'notConfirmed':len(cu)-len(verified),'periodPrecision':'not_provided'}
    except Exception as exc:
        statuses['cu'] = {'status':'unavailable','attemptedAt':now,'reason':type(exc).__name__}
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
    return merge_catalog(old, rows, statuses, now)

def main():
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    result = collect(PublicReader(), old)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(json.dumps({'offers':len(result['offers']), 'sources':result['sources']},ensure_ascii=False))

if __name__ == '__main__':
    main()
