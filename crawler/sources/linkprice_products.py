"""링크프라이스 상품 API — 카테고리별 핫딜 상품.

GET https://api.linkprice.com/ci/product/data/{affiliate_id}
  → 카테고리별(추천/패션/도서/음식) 핫딜 상품 목록
  → 머천트별로 분류된 상품 정보 제공

키(LINKPRICE_AFFILIATE_ID)가 없으면 빈 목록.
"""
from __future__ import annotations
import requests

import config
from classifier import classify_slug
from .base import RawDeal
from .linkprice_policy import (
    MERCHANT_NAMES, approved, is_game_product, product_identity,
    usable_product_image, usable_product_title,
)

API = "https://api.linkprice.com/ci/product/data/{aid}"

# API 카테고리 → 우리 slug 매핑
_CATEGORY_MAP = {
    "list_recommend": "living",    # 추천 → 생활
    "list_fashion": "fashion",     # 패션
    "list_book": "books",          # 도서
    "list_food": "food",           # 음식
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
            merchant_id = str(merchant_id).strip().lower()
            if not approved(merchant_id):
                continue
            if not isinstance(products, list):
                continue

            mall_name = MERCHANT_NAMES.get(merchant_id, merchant_id)

            for p in products:
                if not isinstance(p, dict):
                    continue

                name = p.get("p_name", "")
                price = _to_int(p.get("p_price"))
                url = p.get("target_url", "")
                image = p.get("img_url", "")
                p_code = p.get("p_code", "")

                if (not name or not price or not url or is_game_product(name)
                        or not usable_product_title(name) or not usable_product_image(image)):
                    continue

                deals.append(RawDeal(
                    platform="cps",
                    external_product_id=product_identity(merchant_id, p_code),
                    title=name,
                    image_url=image,
                    product_url=url,
                    affiliate_url=url,  # 이미 제휴링크 포함
                    current_price=price,
                    list_price=None,     # 정가 정보 없음
                    category_slug=classify_slug(name, slug, merchant_id),
                    mall_name=mall_name,
                ))
                total_count += 1

    print(f"[linkprice_products] {total_count}건 수집")
    return deals
