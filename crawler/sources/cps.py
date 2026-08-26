"""국내몰 특가 수집기 — 링크프라이스 핫딜 product API.

GET https://api.linkprice.com/ci/product/data/{affiliate_id}
  → 머천트별 핫딜 상품 리스트(list_[카테고리].[머천트]).
  → target_url에 우리 제휴ID가 이미 박혀 있어 그대로 쓰면 클릭 수익 연결.

주의: 이 API는 현재가(p_price)만 주고 정가/할인 정보가 없다.
  → detect가 '평소 대비'로 판정하려면 가격 이력이 필요(신뢰 우선).
  → 즉 지금 시작해 이력을 쌓고, 3일 뒤부터 진짜 급락한 국내몰 상품이 뜬다.
  → 상품코드(p_code) 단위로 일관 추적(같은 코드=같은 상품).

리얼핫딜 API(/ci/hotdeal/data/, 정가·할인가·여행 포함)는 승인되면 별도 연결.
키(LINKPRICE_AFFILIATE_ID)가 없으면 빈 목록.
"""
from __future__ import annotations
import requests

import config
from .base import RawDeal

API = "https://api.linkprice.com/ci/product/data/{aid}"

# list_ 카테고리 → 우리 slug (recommend는 혼합이라 생활로 일반화, book은 제외)
_CAT_SLUG = {
    "list_recommend": "living",
    "list_fashion": "fashion",
    "list_food": "food",
    "list_digital": "digital",
    "list_beauty": "beauty",
    "list_baby": "baby",
    # list_book 등 우리에 없는 카테고리는 매핑 안 함 → 건너뜀
}

# 머천트 코드 → 표시용 한글명
_MALL = {
    "11st": "11번가", "gmarket": "G마켓", "auction": "옥션", "lotteon": "롯데온",
    "emart": "이마트", "yes24": "예스24", "gongyoung": "공영홈쇼핑",
    "hmall": "Hmall", "nsmall": "NS홈쇼핑", "lotteimall": "롯데홈쇼핑",
    "ssg": "SSG", "gsshop": "GS SHOP",
}


def _to_int(v) -> int:
    try:
        return int(round(float(str(v).replace(",", ""))))
    except (TypeError, ValueError):
        return 0


def fetch() -> list[RawDeal]:
    if not config.LINKPRICE_AFFILIATE_ID:
        print("[cps] LINKPRICE_AFFILIATE_ID 없음 → 건너뜀")
        return []

    try:
        r = requests.get(API.format(aid=config.LINKPRICE_AFFILIATE_ID), timeout=20)
        r.raise_for_status()
        data = r.json()
    except (requests.RequestException, ValueError) as e:
        print(f"[cps] 요청 실패: {e}")
        return []

    if not data.get("success"):
        print("[cps] success=false → 건너뜀")
        return []

    deals: list[RawDeal] = []
    for key, merchants in data.items():
        slug = _CAT_SLUG.get(key)
        if not slug or not isinstance(merchants, dict):
            continue
        for mcode, items in merchants.items():
            if not isinstance(items, list):
                continue
            mall = _MALL.get(mcode, mcode)
            for p in items:
                price = _to_int(p.get("p_price"))
                url = p.get("target_url", "")
                if not price or not url:
                    continue
                deals.append(RawDeal(
                    platform="cps",
                    external_product_id=str(p.get("p_code")),
                    title=p.get("p_name", ""),
                    image_url=p.get("img_url", ""),
                    product_url=url,
                    affiliate_url=url,   # 이미 우리 제휴ID 포함
                    current_price=price,
                    list_price=None,     # 정가 없음 → 이력으로 판정
                    category_slug=slug,
                    mall_name=mall,
                ))

    malls = sorted({d.mall_name for d in deals})
    print(f"[cps] {len(deals)}건 수집 ({', '.join(malls) or '없음'}) — 이력 쌓는 중")
    return deals
