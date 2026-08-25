"""알리익스프레스 어필리에이트 특가 수집기.

- affiliate.hotproduct.query 로 인기/특가 상품 조회
- promotion_link 가 곧 제휴 추적 링크
- 인증: 시스템 파라미터 + HMAC-SHA256 서명(sign)

키가 없으면 빈 목록을 반환한다.
공식 문서: AliExpress Open Platform. 게이트웨이/서명 방식이 버전에 따라
다르니(구 gw.api.taobao.com MD5 vs 신 IOP HMAC-SHA256) 실제 계정 기준으로
한 번 검증하세요. 아래는 신 게이트웨이(HMAC-SHA256) 기준.
"""
from __future__ import annotations
import hashlib
import hmac
import time

import requests

import config
from .base import RawDeal

GATEWAY = "https://api-sg.aliexpress.com/sync"


def _sign(params: dict) -> str:
    """정렬된 key+value 연결 문자열을 HMAC-SHA256 서명."""
    concat = "".join(f"{k}{params[k]}" for k in sorted(params))
    return (
        hmac.new(
            config.ALIEXPRESS_APP_SECRET.encode("utf-8"),
            concat.encode("utf-8"),
            hashlib.sha256,
        )
        .hexdigest()
        .upper()
    )


def _call(method: str, biz_params: dict) -> dict | None:
    params = {
        "method": method,
        "app_key": config.ALIEXPRESS_APP_KEY,
        "timestamp": str(int(time.time() * 1000)),
        "sign_method": "hmac-sha256",
        "format": "json",
        "v": "2.0",
        **{k: str(v) for k, v in biz_params.items()},
    }
    params["sign"] = _sign(params)
    for attempt in range(3):
        try:
            resp = requests.post(GATEWAY, data=params, timeout=15)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    return None


def _to_int_won(price_str) -> int:
    """target_sale_price(KRW 문자열)를 정수 원화로."""
    try:
        return int(round(float(price_str)))
    except (TypeError, ValueError):
        return 0


def _query_page(page_no: int) -> list[dict]:
    data = _call(
        "aliexpress.affiliate.hotproduct.query",
        {
            "target_currency": "KRW",
            "target_language": "ko",
            "ship_to_country": "KR",
            "page_size": 50,
            "page_no": page_no,
            "tracking_id": config.ALIEXPRESS_TRACKING_ID,
        },
    )
    try:
        result = data["aliexpress_affiliate_hotproduct_query_response"][
            "resp_result"
        ]["result"]
        return result["products"]["product"]
    except (KeyError, TypeError):
        print(f"[aliexpress] 응답 파싱 실패(page {page_no}) — 응답 구조 확인")
        return []


def fetch() -> list[RawDeal]:
    if not config.ALIEXPRESS_APP_KEY:
        print("[aliexpress] 키 없음 → 건너뜀")
        return []

    # 여러 페이지 수집 → 후보 확대. 상품ID로 중복 제거.
    seen: dict[str, RawDeal] = {}
    for page in range(1, config.ALIEXPRESS_PAGES + 1):
        for p in _query_page(page):
            pid = str(p.get("product_id"))
            seen.setdefault(pid, RawDeal(
                platform="aliexpress",
                external_product_id=pid,
                title=p.get("product_title", ""),
                image_url=p.get("product_main_image_url", ""),
                product_url=p.get("product_detail_url", ""),
                affiliate_url=p.get("promotion_link")
                or p.get("product_detail_url", ""),
                current_price=_to_int_won(p.get("target_sale_price")),
                list_price=_to_int_won(p.get("target_original_price")) or None,
                category_slug="overseas",
            ))
        time.sleep(0.5)

    deals = list(seen.values())
    print(f"[aliexpress] 후보 총 {len(deals)}건 ({config.ALIEXPRESS_PAGES}페이지)")
    return deals
