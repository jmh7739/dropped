"""링크프라이스 상품 API — 카테고리별 핫딜 상품.

GET https://api.linkprice.com/ci/product/data/{affiliate_id}
  → 카테고리별(추천/패션/도서/음식) 핫딜 상품 목록
  → 머천트별로 분류된 상품 정보 제공

키(LINKPRICE_AFFILIATE_ID)가 없으면 빈 목록.
"""
from __future__ import annotations
import requests

import config
from .base import RawDeal

API = "https://api.linkprice.com/ci/product/data/{aid}"

# API 카테고리 → 우리 slug 매핑
_CATEGORY_MAP = {
    "list_recommend": "living",    # 추천 → 생활
    "list_fashion": "fashion",     # 패션
    "list_book": "books",          # 도서
    "list_food": "food",           # 음식
}

# 머천트 ID → 우리 쇼핑몰명 (affiliate.py와 중복되지만 직접 매핑)
_MERCHANT_NAMES = {
    "11st": "11번가",
    "gmarket": "G마켓",
    "auction": "옥션",
    "wemakeprice": "위메프",
    "ssg": "SSG",
    "lotteon": "롯데온",
    "interpark": "인터파크",
    "ohouse": "오늘의집",
    "oliveyoung": "올리브영",
}


def _to_int(v) -> int:
    try:
        return int(round(float(str(v).replace(",", ""))))
    except (TypeError, ValueError):
        return 0


def fetch() -> list[RawDeal]:
    if not config.LINKPRICE_AFFILIATE_ID:
        print("[linkprice_products] LINKPRICE_AFFILIATE_ID 없음 → 건너뜀")
        return []

    try:
        r = requests.get(API.format(aid=config.LINKPRICE_AFFILIATE_ID), timeout=20)
        r.raise_for_status()
        data = r.json()
    except (requests.RequestException, ValueError) as e:
        print(f"[linkprice_products] 요청 실패: {e}")
        return []

    if not isinstance(data, dict) or not data.get("success"):
        print("[linkprice_products] API 응답 실패 → 건너뜀")
        return []

    deals: list[RawDeal] = []
    total_count = 0

    # 각 카테고리별로 순회
    for api_category, slug in _CATEGORY_MAP.items():
        category_data = data.get(api_category, {})
        if not isinstance(category_data, dict):
            continue

        # 머천트별 상품 리스트
        for merchant_id, products in category_data.items():
            if not isinstance(products, list):
                continue

            mall_name = _MERCHANT_NAMES.get(merchant_id, merchant_id)

            for p in products:
                if not isinstance(p, dict):
                    continue

                name = p.get("p_name", "")
                price = _to_int(p.get("p_price"))
                url = p.get("target_url", "")
                image = p.get("img_url", "")
                p_code = p.get("p_code", "")

                if not name or not price or not url:
                    continue

                deals.append(RawDeal(
                    platform="cps",
                    external_product_id=f"lp_{merchant_id}_{p_code}",
                    title=name,
                    image_url=image,
                    product_url=url,
                    affiliate_url=url,  # 이미 제휴링크 포함
                    current_price=price,
                    list_price=None,     # 정가 정보 없음
                    category_slug=slug,
                    mall_name=mall_name,
                ))
                total_count += 1

    print(f"[linkprice_products] {total_count}건 수집")
    return deals