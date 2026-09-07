"""IndexNow — 새/갱신 URL을 검색엔진(빙·네이버·얀덱스 등)에 즉시 색인 통보.

한 곳(api.indexnow.org)에 제출하면 참여 검색엔진들이 공유받는다.
네이버가 IndexNow를 지원하므로 국내 색인 속도에 특히 유용.
(구글은 IndexNow 미지원 → sitemap 재크롤로 처리)

키 파일: public/{KEY}.txt (내용=KEY) 가 https://dropped.kr/{KEY}.txt 로 서빙돼야 함.
"""
from __future__ import annotations
import requests

SITE = "https://dropped.kr"
HOST = "dropped.kr"
KEY = "e92339646bdd26906f01f4768d2b0efc"
ENDPOINT = "https://api.indexnow.org/indexnow"


def submit(urls: list[str]) -> None:
    urls = [u for u in dict.fromkeys(urls) if u][:10000]  # 중복 제거, 상한
    if not urls:
        return
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": f"{SITE}/{KEY}.txt",
        "urlList": urls,
    }
    try:
        r = requests.post(ENDPOINT, json=payload, timeout=15)
        print(f"[indexnow] {len(urls)}개 URL 제출 → {r.status_code}")
    except requests.RequestException as e:
        print(f"[indexnow] 제출 실패: {e}")
