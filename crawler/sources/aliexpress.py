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


def _query(keyword: str, page_no: int) -> list[dict]:
    data = _call(
        "aliexpress.affiliate.hotproduct.query",
        {
            "keywords": keyword,
            "target_currency": "KRW",
            "target_language": "ko",
            "ship_to_country": "KR",
            "page_size": 50,
            "page_no": page_no,
            "sort": "SALE_PRICE_ASC",
            "tracking_id": config.ALIEXPRESS_TRACKING_ID,
        },
    )
    try:
        result = data["aliexpress_affiliate_hotproduct_query_response"][
            "resp_result"
        ]["result"]
        return result["products"]["product"]
    except (KeyError, TypeError):
        return []


def _volume(p: dict) -> int:
    """판매량(인기 신호). Ali 응답 필드명이 버전따라 lastest/latest 혼용."""
    for k in ("lastest_volume", "latest_volume", "volume"):
        v = p.get(k)
        if v is not None:
            try:
                return int(v)
            except (TypeError, ValueError):
                pass
    return 0


def fetch() -> list[RawDeal]:
    if not config.ALIEXPRESS_APP_KEY:
        print("[aliexpress] 키 없음 → 건너뜀")
        return []

    # 카테고리별로 후보 수집 → 카테고리마다 상위 N개만 → 편중 방지(골고루)
    seen_pid: set[str] = set()
    by_cat: dict[str, list[tuple[float, int, RawDeal]]] = {}
    for slug, keywords in config.ALIEXPRESS_KEYWORDS_BY_CAT.items():
        bucket: list[tuple[float, int, RawDeal]] = []
        for kw in keywords:
            for page in range(1, config.ALIEXPRESS_PAGES + 1):
                for p in _query(kw, page):
                    pid = str(p.get("product_id"))
                    if pid in seen_pid:
                        continue
                    cur = _to_int_won(p.get("target_sale_price"))
                    lst = _to_int_won(p.get("target_original_price")) or None
                    vol = _volume(p)
                    # 정가 없거나(할인율 판단 불가) 판매량 적은 잡템은 제외
                    if not lst or lst <= cur or vol < config.ALIEXPRESS_MIN_VOLUME:
                        continue
                    discount = (lst - cur) / lst
                    # 오류/미끼(밴드 상한 초과)는 아예 수집 안 함
                    if discount > config.PROVISIONAL_MAX_DISCOUNT:
                        continue
                    seen_pid.add(pid)
                    bucket.append((discount, vol, RawDeal(
                        platform="aliexpress",
                        external_product_id=pid,
                        title=p.get("product_title", ""),
                        image_url=p.get("product_main_image_url", ""),
                        product_url=p.get("product_detail_url", ""),
                        affiliate_url=p.get("promotion_link")
                        or p.get("product_detail_url", ""),
                        current_price=cur,
                        list_price=lst,
                        category_slug=slug,
                    )))
                time.sleep(0.4)
        by_cat[slug] = bucket

    # 카테고리별 할인 깊은 순 상위 N개씩 → 합치기
    deals: list[RawDeal] = []
    summary = []
    for slug, bucket in by_cat.items():
        bucket.sort(key=lambda t: (t[0], t[1]), reverse=True)
        picked = [rd for _, _, rd in bucket[: config.ALIEXPRESS_PER_CATEGORY]]
        deals.extend(picked)
        summary.append(f"{slug}:{len(picked)}")
    deals = deals[: config.ALIEXPRESS_MAX_DEALS]
    print(f"[aliexpress] {len(deals)}건 (카테고리별 분산: {', '.join(summary)})")
    return deals
