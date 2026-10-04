"""Keep validated official source snapshots for the Sites collectors.

This job only stores public source documents. Each destination site parses and
labels the data before publishing; a failed fetch leaves the last snapshot.
"""

from pathlib import Path
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent / "marketbot-data"
SOURCES = {
    "seoul-culture.xml": ("https://mediahub.seoul.go.kr/news/rss/06", b"<rss", b"<item"),
    "qnet-1150.html": ("https://www.q-net.or.kr/crf005.do?id=crf00503s02&jmCd=1150&jmInfoDivCcd=B0", b"<html", b"2026"),
    "qnet-1431.html": ("https://www.q-net.or.kr/crf005.do?id=crf00503s02&jmCd=1431&jmInfoDivCcd=B0", b"<html", b"2026"),
    "qnet-1320.html": ("https://www.q-net.or.kr/crf005.do?id=crf00503s02&jmCd=1320&jmInfoDivCcd=B0", b"<html", b"2026"),
}


def collect() -> int:
    ROOT.mkdir(exist_ok=True)
    success = 0
    for name, (url, start, marker) in SOURCES.items():
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; official-feed-reader/1.0)", "Accept": "*/*"})
            with urlopen(request, timeout=25) as response:
                body = response.read(2_000_001)
            if len(body) > 2_000_000 or start not in body.lower() or marker not in body:
                raise ValueError("unexpected source format")
            (ROOT / name).write_bytes(body)
            print(f"updated {name}: {len(body)} bytes")
            success += 1
        except Exception as exc:
            print(f"kept previous {name}: {exc}")
    return success


if __name__ == "__main__":
    if not collect():
        raise SystemExit("No official source could be refreshed")
