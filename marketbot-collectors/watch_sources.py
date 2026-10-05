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
    'LifeMarket': {'unemployment', 'severance', 'housing-benefit'},
    'TripMarket': {'donghae', 'busan-fireworks-2026'},
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
            try:
                content = normalized(get(url, timeout=12).decode('utf-8', errors='replace'))
                if len(content) < 200:
                    continue
                key = site + ':' + str(row['id'])
                data[key] = {'url': url, 'hash': sha256(content.encode()).hexdigest(),
                             'checkedAt': datetime.now(timezone.utc).isoformat()}
                checked += 1
            except Exception:
                pass
            time.sleep(0.7)
        print(site + ': ' + str(checked) + '/' + str(len(selection)) +
              ' selected official pages verified; ' + str(len(sources) - len(eligible)) + ' robots-excluded')
    if data != previous:
        OUT.parent.mkdir(exist_ok=True)
        OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
