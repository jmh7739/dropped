"""Keep validated official source snapshots for the Sites collectors.

This job only stores public source documents. Each destination site parses and
labels the data before publishing; a failed fetch leaves the last snapshot.
"""

from pathlib import Path
from datetime import datetime, timezone
from html import escape, unescape
import json
import re
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parent.parent / "marketbot-data"
SOURCES = {
    "seoul-culture.xml": ("https://mediahub.seoul.go.kr/news/rss/06", b"<rss", b"<item"),
    "qnet-1150.html": ("https://www.q-net.or.kr/crf005.do?id=crf00503s02&jmCd=1150&jmInfoDivCcd=B0", b"<html", b"<table"),
    "qnet-1431.html": ("https://www.q-net.or.kr/crf005.do?id=crf00503s02&jmCd=1431&jmInfoDivCcd=B0", b"<html", b"<table"),
    "qnet-1320.html": ("https://www.q-net.or.kr/crf005.do?id=crf00503s02&jmCd=1320&jmInfoDivCcd=B0", b"<html", b"<table"),
}


def minimal_rss(body: bytes) -> bytes:
    source = ET.fromstring(body)
    channel = source.find('channel')
    if channel is None:
        raise ValueError('RSS channel missing')
    result = ET.Element('rss', {'version': '2.0'})
    target = ET.SubElement(result, 'channel')
    build_date = channel.findtext('lastBuildDate')
    if not build_date:
        raise ValueError('RSS date missing')
    ET.SubElement(target, 'lastBuildDate').text = build_date
    for item in channel.findall('item')[:60]:
        title = item.findtext('title') or ''
        link = item.findtext('link') or ''
        published = item.findtext('pubDate') or ''
        if not title or not re.fullmatch(r'https://mediahub\.seoul\.go\.kr/archives/\d+', link) or not published:
            continue
        node = ET.SubElement(target, 'item')
        for tag, value in [('title', title), ('link', link), ('pubDate', published)]:
            ET.SubElement(node, tag).text = value
    if not target.findall('item'):
        raise ValueError('RSS has no valid article metadata')
    return ET.tostring(result, encoding='utf-8', xml_declaration=True)


def minimal_qnet(body: bytes) -> bytes:
    html = body.decode('utf-8', errors='replace')
    rows = []
    for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', html, re.I | re.S):
        cells = [re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]+>', ' ', cell))).strip()
                 for cell in re.findall(r'<td\b[^>]*>(.*?)</td>', row, re.I | re.S)]
        if len(cells) >= 7 and re.search(r'20\d{2}년\s*정기\s*기사\s*\d+회', cells[0]):
            rows.append([cells[0], '', '', '', cells[4], cells[5], cells[6]])
    if not rows:
        raise ValueError('Q-net schedule rows missing')
    table = ''.join('<tr>' + ''.join(f'<td>{escape(cell)}</td>' for cell in row) + '</tr>' for row in rows)
    return f'<html><head><title>Q-net timetable facts</title></head><body><table>{table}</table></body></html>'.encode()


def collect() -> int:
    ROOT.mkdir(exist_ok=True)
    manifest_path = ROOT / "checked-at.json"
    try:
        checked_at = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        checked_at = {}
    success = 0
    for name, (url, start, marker) in SOURCES.items():
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; official-feed-reader/1.0)", "Accept": "*/*"})
            with urlopen(request, timeout=25) as response:
                body = response.read(2_000_001)
            if len(body) > 2_000_000 or start not in body.lower() or marker not in body:
                raise ValueError("unexpected source format")
            body = minimal_rss(body) if name.endswith('.xml') else minimal_qnet(body)
            (ROOT / name).write_bytes(body)
            checked_at[name] = datetime.now(timezone.utc).isoformat()
            print(f"updated {name}: {len(body)} bytes")
            success += 1
        except Exception as exc:
            print(f"kept previous {name}: {exc}")
    if success:
        manifest_path.write_text(json.dumps(checked_at, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return success


if __name__ == "__main__":
    if not collect():
        raise SystemExit("No official source could be refreshed")
