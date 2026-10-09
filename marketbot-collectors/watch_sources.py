"""Check a rotating sample of public official pages from GitHub Actions.

Only SHA-256 digests are published. robots.txt is checked per origin; blocked
pages remain unverified in MarketOps rather than being counted as healthy.
"""

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
import json
import re
import time


OUT = Path(__file__).resolve().parent.parent / 'marketbot-data' / 'source-digests.json'
USER_AGENT = 'MarketBot/1.0 (+https://marketbot-ops-jmh7739.jmh7739.chatgpt.site)'
BASE = {
    'LifeMarket': 'https://lifemkt.kr',
    'TripMarket': 'https://tripmkt.kr',
}
CORE = {
    'LifeMarket': {'unemployment', 'severance', 'housing-benefit', 'school-entry'},
    'TripMarket': {'donghae', 'busan-fireworks-2026', 'jeju-olle-walking-2026', 'je-hamdeok', 'je-bijarim'},
}


def get(url, timeout=10):
    req = Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'text/html,application/json'})
    with urlopen(req, timeout=timeout) as response:
        return response.read(1_000_000)


def normalized(html):
    text = re.sub(r'<script\b[\s\S]*?</script>', ' ', html, flags=re.I)
    text = re.sub(r'<style\b[\s\S]*?</style>', ' ', text, flags=re.I)
    text = re.sub(r'<(?:header|nav|footer)\b[\s\S]*?</(?:header|nav|footer)>', ' ', text, flags=re.I)
    text = re.sub(r'<[^>]*>', ' ', text)
    text = re.sub(r'&(?:nbsp|amp|lt|gt|quot);', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()[:30_000]


def article_div(html, opening):
    start = re.search(opening, html, flags=re.I)
    if not start:
        return None
    depth = 0
    for tag in re.finditer(r'</?div\b[^>]*>', html[start.start():], flags=re.I):
        depth += -1 if tag.group().lower().startswith('</div') else 1
        if depth == 0:
            return html[start.start():start.start() + tag.end()]
    return None


def applyhome_guide(html):
    box = article_div(html, r'<div\b[^>]*class=["\'][^"\']*\bsub_content_box\b[^"\']*["\'][^>]*>')
    if not box:
        return None
    heading = re.search(r'<h4\b[^>]*class=["\'][^"\']*\bsub_tit\b[^"\']*["\'][^>]*>[\s\S]*?</h4>', box, re.I)
    intro = article_div(box, r'<div\b[^>]*class=["\'][^"\']*\bnoti_line\b[^"\']*["\'][^>]*>')
    notes = re.search(r'<ul\b[^>]*class=["\'][^"\']*\bbul_list\b[^"\']*["\'][^>]*>[\s\S]*?</ul>', box, re.I)
    if not heading or not intro or not notes:
        return None
    return ' '.join((heading.group(), intro, notes.group()))


def content_for(url, html):
    host = urlparse(url).hostname
    if host == 'finlife.fss.or.kr' and ('금융감독원 대국민 서비스 중단 안내' in html or '전기설비 안전점검에 따른 정전' in html):
        raise ValueError('official financial service maintenance')
    if host == 'www.visitjeju.net':
        article = article_div(html, r'<div\b[^>]*class=["\'][^"\']*\breal\b[^"\']*["\'][^>]*>')
    elif host == 'sungsimdang.co.kr':
        article = article_div(html, r'<div\b[^>]*class=["\'][^"\']*\btbl_view_head\b[^"\']*["\'][^>]*>')
    elif host == 'english.visitkorea.or.kr' and 'vcontsId=182518' in url:
        article = article_div(html, r'<div\b[^>]*class=["\'][^"\']*\balley\b[^"\']*\bdaegu\b[^"\']*["\'][^>]*>')
    elif host == 'english.visitkorea.or.kr' and 'vcontsId=249989' in url:
        article = article_div(html, r'<div\b[^>]*class=["\'][^"\']*\bpage4_wrap\b[^"\']*["\'][^>]*>')
    elif host == 'korean.visitseoul.net':
        root = article_div(html, r'<div\b[^>]*class=["\'][^"\']*\bsub-contents-inner\b[^"\']*["\'][^>]*>')
        description = article_div(root, r'<div\b[^>]*class=["\'][^"\']*\btext-area\b[^"\']*["\'][^>]*>') if root else None
        facts = article_div(root, r'<div\b[^>]*class=["\'][^"\']*\bdetial-cont-element\b[^"\']*["\'][^>]*>') if root else None
        article = description + (' ' + facts if facts else '') if description else None
    elif host == 'www.moe.go.kr':
        article = article_div(html, r'<div\b[^>]*id=["\']txt["\'][^>]*>')
    elif host == 'www.applyhome.co.kr':
        article = applyhome_guide(html)
    elif host == 'www.kosaf.go.kr':
        title = re.search(r'<th\b[^>]*id=["\']VIEW_TITLE["\'][^>]*>[\s\S]*?</th>', html, flags=re.I)
        body = re.search(r'<td\b[^>]*id=["\']VIEW_MCONTENT["\'][^>]*>[\s\S]*?</td>', html, flags=re.I)
        article = title.group() + ' ' + body.group() if title and body else None
    elif host == 'korean.visitkorea.or.kr' and '/kfes/detail/' in urlparse(url).path:
        info = article_div(html, r'<div\b[^>]*class=["\'][^"\']*\bfestival_info\b[^"\']*["\'][^>]*>')
        body = article_div(html, r'<div\b[^>]*class=["\'][^"\']*\bposter_info_content\b[^"\']*["\'][^>]*>')
        fixed_info = re.sub(r'^(?:축제 진행 중|축제 개최중|축제 예정|축제 종료)\s*', '', normalized(info)) if info else ''
        article = fixed_info + ' ' + body if info and body else None
    else:
        article = html
    if not article:
        raise ValueError('official article body missing')
    return normalized(article)


def content_version(url):
    host = urlparse(url).hostname
    if host == 'sungsimdang.co.kr':
        return 'store-facts-v1'
    if host == 'finlife.fss.or.kr':
        return 'finance-guide-v1'
    if host == 'english.visitkorea.or.kr' and 'vcontsId=182518' in url:
        return 'apsan-article-v1'
    if host == 'english.visitkorea.or.kr' and 'vcontsId=249989' in url:
        return 'shopping-article-v1'
    if host == 'korean.visitseoul.net':
        return 'article-v5'
    if host == 'www.applyhome.co.kr':
        return 'guide-v1'
    if host == 'www.kosaf.go.kr':
        return 'notice-v1'
    if host == 'korean.visitkorea.or.kr' and '/kfes/detail/' in urlparse(url).path:
        return 'festival-v1'
    return 'article-v2' if host in {'www.visitjeju.net', 'www.moe.go.kr'} else 'page-v1'


def selected(site, sources):
    core = [row for row in sources if row.get('id') in CORE[site]]
    other = [row for row in sources if row.get('id') not in CORE[site]]
    room = max(0, 12 - len(core))
    day = int(time.time() // 86400)
    offset = day * room % len(other) if other else 0
    return (core + [other[(offset + i) % len(other)] for i in range(min(room, len(other)))])[:12]


def main():
    previous = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    data = dict(previous)
    unavailable = {}
    robots = {}
    for site, base in BASE.items():
        try:
            sources = json.loads(get(base + '/api/marketbot/sources'))['sources']
        except Exception as exc:
            print(site + ' manifest: ' + type(exc).__name__)
            continue
        eligible = []
        for row in sources:
            url = row.get('url', '')
            parsed = urlparse(url)
            if parsed.scheme != 'https' or not parsed.netloc:
                continue
            origin = parsed.scheme + '://' + parsed.netloc
            if origin not in robots:
                parser = RobotFileParser(origin + '/robots.txt')
                try:
                    parser.parse(get(origin + '/robots.txt', timeout=7).decode('utf-8', errors='replace').splitlines())
                    robots[origin] = parser
                except Exception:
                    robots[origin] = None
            parser = robots[origin]
            if parser is None or not parser.can_fetch(USER_AGENT, url):
                continue
            eligible.append(row)
        selection = selected(site, eligible)
        data.setdefault('selection', {})[site] = {'day': int(time.time() // 86400),
            'ids': [str(row['id']) for row in selection], 'eligibleCount': len(eligible),
            'robotsExcluded': len(sources) - len(eligible)}
        checked = 0
        for row in selection:
            url = row['url']
            key = site + ':' + str(row['id'])
            try:
                content = content_for(url, get(url, timeout=12).decode('utf-8', errors='replace'))
                if len(content) < 200:
                    raise ValueError('official article too short')
                data[key] = {'url': url, 'hash': sha256(content.encode()).hexdigest(), 'version': content_version(url),
                             'checkedAt': datetime.now(timezone.utc).isoformat()}
                checked += 1
            except Exception as exc:
                unavailable[key] = {'reason': str(exc)[:120] or type(exc).__name__,
                                    'checkedAt': datetime.now(timezone.utc).isoformat()}
            time.sleep(0.7)
        print(site + ': ' + str(checked) + '/' + str(len(selection)) +
              ' selected official pages verified; ' + str(len(sources) - len(eligible)) + ' robots-excluded')
    data['unavailable'] = unavailable
    if data != previous:
        OUT.parent.mkdir(exist_ok=True)
        OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
