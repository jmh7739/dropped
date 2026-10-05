"""Fetch approved public-data APIs outside the Sites runtime.

Only selected public metadata is committed. The service key stays in the
GitHub Actions secret and is never written to files or error messages.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json
import os
import sys
import xml.etree.ElementTree as ET


OUT = Path(__file__).resolve().parent.parent / 'marketbot-data' / 'public-feed.json'
KEY = os.environ.get('PUBLIC_DATA_SERVICE_KEY', '').strip()
KST = timezone(timedelta(hours=9))
COMPANIES = ['삼성전자', 'SK하이닉스', 'NAVER', '카카오', '현대자동차', 'LG전자']


def request(path, params):
    query = urlencode({'serviceKey': KEY, **params})
    req = Request('https://apis.data.go.kr/' + path + '?' + query,
                  headers={'User-Agent': 'MarketBot/1.0', 'Accept': 'application/json, application/xml, text/xml'})
    with urlopen(req, timeout=30) as response:
        body = response.read(3_000_000)
    if b'SERVICE_KEY_IS_NOT_REGISTERED_ERROR' in body or b'SERVICE_ACCESS_DENIED_ERROR' in body:
        raise ValueError('API authorization failed')
    return body


def items(data):
    header = data.get('response', {}).get('header', {})
    if str(header.get('resultCode', '00')) not in ('00', '0000'):
        raise ValueError('API result code ' + str(header.get('resultCode')))
    value = data.get('response', {}).get('body', {}).get('items', {})
    value = value.get('item', []) if isinstance(value, dict) else value
    return value if isinstance(value, list) else [value] if isinstance(value, dict) else []


def select(row, names):
    return {name: row.get(name) for name in names if row.get(name) is not None}


def exams():
    output = []
    for year in (datetime.now(KST).year, datetime.now(KST).year + 1):
        data = json.loads(request('B490007/qualExamSchd/getQualExamSchdList', {
            'numOfRows': '100', 'pageNo': '1', 'dataFormat': 'json', 'implYy': str(year), 'qualgbCd': 'T'}))
        output.extend(select(row, ('implYy', 'implSeq', 'qualgbCd', 'qualgbNm', 'description',
            'docRegStartDt', 'docRegEndDt', 'docExamStartDt', 'docExamEndDt', 'docPassDt',
            'pracRegStartDt', 'pracRegEndDt', 'pracExamStartDt', 'pracExamEndDt', 'pracPassDt'))
            for row in items(data))
    if not output:
        raise ValueError('empty exam response')
    return output


def ott():
    output = []
    since = (datetime.now(KST) - timedelta(days=14)).strftime('%Y%m%d')
    for page in range(1, 4):
        root = ET.fromstring(request('B551008/irating_v1/ir_search', {
            'pageNo': str(page), 'numOfRows': '100', 'stDate': since}))
        code = root.findtext('.//resultCode')
        if code and code not in ('00', '0000'):
            raise ValueError('OTT result code ' + code)
        rows = root.findall('.//item')
        output.extend({key: row.findtext(key) for key in
            ('wrksNm', 'rtNo', 'corpNm', 'grdNm', 'rtYmd', 'srvcPvsnYmd', 'vidKndNm', 'ntnNm')
            if row.findtext(key)} for row in rows)
        if len(rows) < 100:
            break
    if not output:
        raise ValueError('empty OTT response')
    return output


def market_prices():
    today = datetime.now(KST)
    data = json.loads(request('B552845/perDay/price', {
        'pageNo': '1', 'numOfRows': '100',
        'cond[exmn_ymd::GTE]': (today - timedelta(days=7)).strftime('%Y%m%d'),
        'cond[exmn_ymd::LTE]': today.strftime('%Y%m%d'),
        'returnType': 'JSON'}))
    rows = [select(row, ('exmn_ymd', 'item_nm', 'exmn_dd_prc', 'exmn_dd_cnvs_prc',
        'se_cd', 'se_nm', 'ctgry_nm', 'item_cd', 'vrty_cd', 'vrty_nm', 'grd_cd',
        'grd_nm', 'mrkt_cd', 'mrkt_nm', 'unit', 'unit_sz')) for row in items(data)]
    if not rows:
        raise ValueError('empty market price response')
    return rows


def companies():
    output = []
    for name in COMPANIES:
        data = json.loads(request('1160100/service/GetCorpBasicInfoService_V2/getCorpOutline_V2', {
            'pageNo': '1', 'numOfRows': '5', 'resultType': 'json', 'corpNm': name}))
        output.extend(select(row, ('corpNm', 'crno', 'sicNm', 'enpMainBizNm',
            'enpEmpeCnt', 'enpEstbDt', 'fssCorpChgDtm')) for row in items(data)
            if str(row.get('corpNm', '')).replace(' ', '').lower() == name.replace(' ', '').lower())
    if not output:
        raise ValueError('empty company response')
    return output


def disclosures(company_rows):
    output = []
    for company in company_rows:
        crno = str(company.get('crno', ''))
        if not crno:
            continue
        data = json.loads(request('1160100/service/GetDiscInfoService_V2/getDiviDiscInfo_V2', {
            'pageNo': '1', 'numOfRows': '5', 'resultType': 'json', 'crno': crno}))
        output.extend(select(row, ('crno', 'basDt', 'crtmCashTdvdAmt', 'crtmStckTdvdAmt'))
            for row in items(data) if str(row.get('crno', '')) == crno)
    return output


def main():
    previous = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    current = dict(previous)
    failures = []
    functions = {'exams': exams, 'ott': ott, 'marketPrices': market_prices, 'companies': companies}
    for name, fetcher in functions.items():
        try:
            if not KEY:
                raise ValueError('API key missing')
            rows = fetcher()
            current[name] = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'items': rows}
            print(name + ': ' + str(len(rows)) + ' verified records')
        except Exception as exc:
            failures.append(name)
            print(name + ': refresh failed (' + type(exc).__name__ + '); previous snapshot kept')
    if 'companies' in current and current['companies'].get('items') and 'companies' not in failures:
        try:
            rows = disclosures(current['companies']['items'])
            current['disclosures'] = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'items': rows}
            print('disclosures: ' + str(len(rows)) + ' verified records')
        except Exception as exc:
            failures.append('disclosures')
            print('disclosures: refresh failed (' + type(exc).__name__ + '); previous snapshot kept')
    else:
        failures.append('disclosures')
        print('disclosures: refresh skipped because current company data is unavailable')
    current['_collection'] = {'checkedAt': datetime.now(timezone.utc).isoformat(),
                              'status': 'partial' if failures else 'complete',
                              'failed': failures}
    if current != previous:
        OUT.parent.mkdir(exist_ok=True)
        OUT.write_text(json.dumps(current, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    if failures:
        print('Public data refresh incomplete: ' + ', '.join(failures))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
