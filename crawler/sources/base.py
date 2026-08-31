"""수집 소스 공통 타입."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional


@dataclass
class RawDeal:
    """플랫폼에서 긁어온 원시 특가 항목."""
    platform: str                 # 'coupang' | 'aliexpress' | 'cps' | 'naver'
    external_product_id: str
    title: str
    image_url: str
    product_url: str
    affiliate_url: str
    current_price: int
    list_price: Optional[int]     # 정가(있으면)
    category_slug: str            # 우리 카테고리 slug로 매핑된 값
    mall_name: Optional[str] = None  # 표시용 쇼핑몰명 (G마켓/쿠팡 등)
    shipping_fee: Optional[int] = None  # 배송비 (0=무료, None=정보없음)
    unit_price: Optional[str] = None  # 단위가격 (예: "100g당 1,094원")
    # 가격추적 급락딜이 아니어도 'MD 추천 특가'로 노출할 후보(국내몰 큐레이션).
    #   이미지·이름 품질이 확보된 것만 True. collect_and_flag가 curated 딜로 기록.
    curated: bool = False
