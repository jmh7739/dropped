"""링크프라이스 인기상품(popularProducts) API — 진짜 할인 데이터 포함.

POST https://api.linkprice.com/popularProducts/affiliateId/{aid}
  → 어필리에이트 센터 'BEST 상품' 피드. 원가·할인가·할인율·판매량 포함.
  → 응답: {code, msg, total, list:[{merchant_id, product_id, title, image_link,
           price(정가), sale_price(할인가), sales_count, discount_rate, commission,
           click_url, rank}]}

국내몰(하프클럽·롯데온·11번가·오늘의집·하이마트·G마켓)의 '실제 판매가 기준 할인'.
  ⚠️ aliexpress는 정가 뻥튀기(거짓정가)라 제외 — 알리는 별도 소스에서 실이력 추적.

키(LINKPRICE_AFFILIATE_ID) 없으면 빈 목록.
"""
from __future__ import annotations
import requests

import affiliate
import config
from .base import RawDeal
from .cps import _slug_by_name  # 상품명 → 우리 slug (공용)

API = "https://api.linkprice.com/popularProducts/affiliateId/{aid}"

# 알리는 거짓정가라 제외 (알리는 aliexpress 소스에서 실이력으로 추적)
_SKIP_MERCHANTS = {"aliexpress"}


def fetch() -> list[RawDeal]:
    if not config.LINKPRICE_AFFILIATE_ID:
        print("[popular] LINKPRICE_AFFILIATE_ID 없음 → 건너뜀")
        return []
    try:
        r = requests.post(
            API.format(aid=config.LINKPRICE_AFFILIATE_ID),
            headers={"Content-Type": "application/json"},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
    except (requests.RequestException, ValueError) as e:
        print(f"[popular] 요청 실패: {e}")
        return []

    if data.get("code") != 0:
        print(f"[popular] code={data.get('code')} → 건너뜀")
        return []

    deals: list[RawDeal] = []
    for x in data.get("list", []):
        mcode = str(x.get("merchant_id", ""))
        if mcode in _SKIP_MERCHANTS:
            continue
        title = str(x.get("title", "")).strip()
        img = str(x.get("image_link", "")).strip()
        url = str(x.get("click_url", "")).strip()
        sale = int(x.get("sale_price") or 0)          # 할인가(현재가)
        normal = int(x.get("price") or 0)             # 정가(원가)
        disc = int(x.get("discount_rate") or 0)       # 할인율 %
        sales = int(x.get("sales_count") or 0)        # 판매량
        # 품질: 이미지·이름·링크·5천원 이상 + 실제 할인(정가>할인가)
        if not (title and img and url) or sale < 5000:
            continue
        if not (normal > sale and disc > 0):
            continue
        # '괜찮은 것만': 할인율 15%+ & 판매량 10+ (의미있는 할인 + 실판매)
        if disc < 15 or sales < 10:
            continue
        deals.append(RawDeal(
            platform="cps",
            external_product_id=f"pp_{mcode}_{x.get('product_id')}",
            title=title,
            image_url=img,
            product_url=url,
            affiliate_url=url,          # 우리 제휴ID 포함
            current_price=sale,         # 할인가
            list_price=normal,          # 정가(원가) — 실제 판매가 기준(거짓정가 아님)
            category_slug=_slug_by_name(title) or "living",
            mall_name=affiliate.merchant_name(mcode),
            curated=True,               # 국내몰 추천 특가로 노출(할인율 표시)
        ))

    malls = sorted({d.mall_name for d in deals})
    print(f"[popular] {len(deals)}건 (할인 상품, {', '.join(malls) or '없음'})")
    return deals
