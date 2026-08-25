"""네이버 쇼핑 검색 API — 후보 발굴용.

네이버는 특가 피드가 없어, 키워드/카테고리로 인기 상품을 후보로 모아
가격을 추적하다가 평소보다 싸지면 잡는다.
- 검색 API: GET https://openapi.naver.com/v1/search/shop.json
- 최저가(lprice)와 판매몰(mallName) 제공
- 네이버 자체 제휴 수익 링크는 없음 → 판매몰이 CPS(링크프라이스) 지원이면
  affiliate.to_affiliate로 변환, 아니면 네이버 상품 링크 그대로 사용.

키가 없으면 빈 목록 반환. 일 25,000콜 한도 주의.
"""
from __future__ import annotations
import re
import time

import requests

import config
import affiliate
from .base import RawDeal

API = "https://openapi.naver.com/v1/search/shop.json"
_TAG = re.compile(r"<[^>]+>")

# 네이버 category1 → 우리 slug
CATEGORY_SLUG = {
    "디지털/가전": "digital",
    "패션의류": "fashion",
    "패션잡화": "fashion",
    "화장품/미용": "beauty",
    "식품": "food",
    "생활/건강": "living",
    "스포츠/레저": "sports",
    "출산/육아": "baby",
    "가구/인테리어": "living",
}


def _slug(cat1: str) -> str:
    return CATEGORY_SLUG.get(cat1 or "", "living")


def _search(keyword: str) -> list[dict]:
    headers = {
        "X-Naver-Client-Id": config.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": config.NAVER_CLIENT_SECRET,
    }
    params = {"query": keyword, "display": config.NAVER_DISPLAY, "sort": "sim"}
    resp = requests.get(API, headers=headers, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json().get("items", [])


def fetch() -> list[RawDeal]:
    if not (config.NAVER_CLIENT_ID and config.NAVER_CLIENT_SECRET):
        print("[naver] 키 없음 → 건너뜀")
        return []

    seen: dict[str, RawDeal] = {}
    for kw in config.NAVER_KEYWORDS:
        try:
            items = _search(kw)
        except requests.RequestException as e:
            print(f"[naver] '{kw}' 실패: {e}")
            continue
        for it in items:
            pid = str(it.get("productId"))
            if pid in seen:
                continue
            link = it.get("link", "")
            conv = affiliate.to_affiliate(link)
            aff_url, mall = conv if conv else (link, it.get("mallName") or "네이버")
            price = int(it.get("lprice") or 0)
            if price <= 0:
                continue
            seen[pid] = RawDeal(
                platform="naver",
                external_product_id=pid,
                title=_TAG.sub("", it.get("title", "")).strip(),
                image_url=it.get("image", ""),
                product_url=link,
                affiliate_url=aff_url,
                current_price=price,
                list_price=None,
                category_slug=_slug(it.get("category1", "")),
                mall_name=mall,
            )
        time.sleep(0.3)  # 매너/쿼터

    deals = list(seen.values())
    print(f"[naver] 후보 총 {len(deals)}건 ({len(config.NAVER_KEYWORDS)}개 키워드)")
    return deals
