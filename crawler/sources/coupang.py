"""쿠팡 파트너스 후보 수집기 (특가 + 베스트셀러 랭킹).

- 골드박스 API로 특가 목록 조회 (이미 할인 중인 것)
- 베스트카테고리 API로 카테고리별 베스트셀러까지 후보 확대
  → 특가 피드 밖 상품도 추적 대상에 포함 (평소보다 싸지면 detect가 잡음)
- 딥링크 API로 상품URL → 제휴(추적) 링크 일괄 변환 (콜 절약)
- 인증: CEA(HmacSHA256) 서명 헤더

키가 없으면 빈 목록을 반환한다.
공식 문서: 쿠팡 파트너스 > Open API. 엔드포인트/필드명이 바뀔 수 있으니
실제 응답으로 매핑을 한 번 검증하세요.
"""
from __future__ import annotations
import hashlib
import hmac
import time
from datetime import datetime, timezone

import requests

import config
from .base import RawDeal

BASE = "https://api-gateway.coupang.com"
API_ROOT = "/v2/providers/affiliate_open_api/apis/openapi/v1"
GOLDBOX_PATH = f"{API_ROOT}/products/goldbox"
BESTCAT_PATH = f"{API_ROOT}/products/bestcategories"  # /{categoryId}
DEEPLINK_PATH = f"{API_ROOT}/deeplink"

# 쿠팡 카테고리ID → 우리 slug
CATEGORY_ID_SLUG = {
    1010: "beauty", 1011: "baby", 1012: "food", 1013: "living",
    1014: "living", 1015: "living", 1016: "appliance", 1017: "sports",
    1020: "sports", 1024: "food", 1029: "living",
}


def _auth_header(method: str, path: str, query: str = "") -> str:
    """CEA HmacSHA256 서명 헤더 생성."""
    dt = datetime.now(timezone.utc).strftime("%y%m%dT%H%M%SZ")
    message = dt + method + path + query
    signature = hmac.new(
        config.COUPANG_SECRET_KEY.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return (
        f"CEA algorithm=HmacSHA256, access-key={config.COUPANG_ACCESS_KEY}, "
        f"signed-date={dt}, signature={signature}"
    )


def _request(method: str, path: str, query: str = "", body: dict | None = None):
    """서명 + 백오프 재시도 포함 요청."""
    url = BASE + path + (("?" + query) if query else "")
    for attempt in range(3):
        try:
            resp = requests.request(
                method,
                url,
                headers={
                    "Authorization": _auth_header(method, path, query),
                    "Content-Type": "application/json;charset=UTF-8",
                },
                json=body,
                timeout=15,
            )
            if resp.status_code == 429:  # 쿼터 초과 → 백오프
                time.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    return None


def _to_affiliate_batch(urls: list[str]) -> dict[str, str]:
    """여러 상품 URL → 딥링크 일괄 변환(콜 절약). {원본URL: 제휴URL}."""
    result: dict[str, str] = {}
    for i in range(0, len(urls), 100):  # 딥링크 API 100개씩
        chunk = urls[i:i + 100]
        try:
            data = _request("POST", DEEPLINK_PATH, body={"coupangUrls": chunk})
            for it in (data or {}).get("data") or []:
                orig = it.get("originalUrl")
                land = it.get("landingUrl") or it.get("shortenUrl")
                if orig and land:
                    result[orig] = land
        except Exception as e:
            print(f"[coupang] deeplink 실패: {e}")
        time.sleep(0.5)
    return result


def _category_map(coupang_category: str) -> str:
    """쿠팡 원본 카테고리명 → 우리 slug (부분일치)."""
    table = {
        "가전": "appliance",
        "디지털": "digital",
        "컴퓨터": "digital",
        "노트북": "digital",
        "휴대폰": "mobile",
        "태블릿": "mobile",
        "출산": "baby",
        "유아": "baby",
        "식품": "food",
        "생활": "living",
        "주방": "living",
        "패션": "fashion",
        "뷰티": "beauty",
        "화장품": "beauty",
        "스포츠": "sports",
    }
    for key, slug in table.items():
        if key in (coupang_category or ""):
            return slug
    return "living"


def _map_product(p: dict, default_slug: str) -> RawDeal:
    """쿠팡 상품 응답 → RawDeal (affiliate_url은 원본, 이후 일괄 변환)."""
    product_url = p.get("productUrl", "")
    slug = _category_map(p.get("categoryName", "")) if p.get("categoryName") \
        else default_slug
    return RawDeal(
        platform="coupang",
        external_product_id=str(p.get("productId")),
        title=p.get("productName", ""),
        image_url=p.get("productImage", ""),
        product_url=product_url,
        affiliate_url=product_url,  # 아래에서 딥링크로 교체
        current_price=int(p.get("productPrice", 0)),
        list_price=int(p["basePrice"]) if p.get("basePrice") else None,
        category_slug=slug,
    )


def fetch() -> list[RawDeal]:
    if not config.COUPANG_ACCESS_KEY:
        print("[coupang] 키 없음 → 건너뜀")
        return []

    # 상품ID 기준 중복 제거하며 후보 수집
    candidates: dict[str, RawDeal] = {}

    # 1) 특가 피드 (골드박스)
    gb = (_request("GET", GOLDBOX_PATH) or {}).get("data") or []
    for p in gb:
        d = _map_product(p, "living")
        candidates[d.external_product_id] = d
    print(f"[coupang] 골드박스 {len(gb)}건")

    # 2) 베스트카테고리 랭킹 (후보 대폭 확대)
    for cid in config.COUPANG_BEST_CATEGORIES:
        path = f"{BESTCAT_PATH}/{cid}"
        query = f"limit={config.COUPANG_BEST_LIMIT}"
        try:
            rows = (_request("GET", path, query) or {}).get("data") or []
        except Exception as e:
            print(f"[coupang] 베스트 {cid} 실패: {e}")
            continue
        slug = CATEGORY_ID_SLUG.get(cid, "living")
        for p in rows:
            d = _map_product(p, slug)
            candidates.setdefault(d.external_product_id, d)
        time.sleep(0.5)  # 매너/쿼터

    deals = list(candidates.values())

    # 3) 제휴링크 일괄 변환
    aff = _to_affiliate_batch([d.product_url for d in deals if d.product_url])
    for d in deals:
        d.affiliate_url = aff.get(d.product_url, d.product_url)

    print(f"[coupang] 후보 총 {len(deals)}건 (특가+베스트)")
    return deals
