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


# ── 상품의 '실제 Ali 카테고리'로 우리 slug 판정 (키워드 오분류 방지) ──
# 보충제는 Ali가 '뷰티 & 헬스'로 묶어서, 제목으로 식품/건강 vs 뷰티 구분.
_SUPPLEMENT = (
    "비타민", "보충제", "영양제", "콜라겐", "홍삼", "인삼", "유산균", "오메가",
    "프로틴", "단백질", "글루코사민", "마그네슘", "아연", "프로폴리스", "루테인",
    "밀크씨슬", "코엔자임", "엽산", "칼슘", "히알루론",
)
# (Ali 1차 카테고리명 부분일치, 위에서부터 우선) → 우리 slug. 'bh'=뷰티/헬스 특수처리
_ALI_CAT_MAP = [
    ("음식", "food"), ("식품", "food"),
    ("아기", "baby"), ("엄마", "baby"), ("완구", "baby"), ("장난감", "baby"),
    ("유아", "baby"), ("취미", "baby"),
    ("뷰티", "bh"), ("헬스", "bh"), ("미용", "bh"), ("화장", "bh"), ("헤어", "bh"),
    ("컴퓨터", "digital"), ("오피스", "digital"), ("사무", "digital"),
    ("소비자 가전", "appliance"), ("가전", "appliance"),
    ("휴대폰", "mobile"), ("통신", "mobile"), ("셀폰", "mobile"),
    ("의류", "fashion"), ("신발", "fashion"), ("가방", "fashion"), ("캐리어", "fashion"),
    ("주얼리", "fashion"), ("액세서리", "fashion"), ("시계", "fashion"), ("패션", "fashion"),
    ("스포츠", "sports"), ("아웃도어", "sports"), ("피트니스", "sports"),
    ("홈", "living"), ("가든", "living"), ("생활", "living"), ("주방", "living"),
    ("가구", "living"), ("자동차", "living"), ("오토바이", "living"), ("공구", "living"),
    ("조명", "living"), ("반려", "living"), ("애완", "living"), ("보안", "living"),
    ("안전", "living"), ("전자", "digital"),
]


def _our_slug(p: dict) -> str | None:
    """상품의 실제 Ali 카테고리 → 우리 slug. 못 맞추면 None(잡템 제외)."""
    cat = p.get("first_level_category_name") or ""
    slug = None
    for sub, s in _ALI_CAT_MAP:
        if sub in cat:
            slug = s
            break
    if slug == "bh":  # 뷰티 & 헬스 → 제목에 보충제 힌트 있으면 식품/건강, 아니면 뷰티
        title = p.get("product_title", "")
        return "food" if any(h in title for h in _SUPPLEMENT) else "beauty"
    return slug


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

    # 모든 키워드로 상품을 찾되, 분류는 '상품의 실제 Ali 카테고리'로 → 오분류 방지.
    #   못 맞추는 잡템은 아예 제외. 카테고리별 상위 N개만 유지.
    seen_pid: set[str] = set()
    by_cat: dict[str, list[tuple[float, int, RawDeal]]] = {}
    all_keywords = [
        kw for kws in config.ALIEXPRESS_KEYWORDS_BY_CAT.values() for kw in kws
    ]
    for kw in all_keywords:
        for page in range(1, config.ALIEXPRESS_PAGES + 1):
            for p in _query(kw, page):
                pid = str(p.get("product_id"))
                if pid in seen_pid:
                    continue
                slug = _our_slug(p)      # 실제 카테고리로 판정
                if not slug:             # 분류 불가(잡템) → 제외
                    continue
                cur = _to_int_won(p.get("target_sale_price"))
                lst = _to_int_won(p.get("target_original_price")) or None
                vol = _volume(p)
                # 인기 상품만 추적(안 팔리는 잡템 제외). 할인 없어도 추적함.
                if vol < config.ALIEXPRESS_MIN_VOLUME or cur <= 0:
                    continue
                # 정가는 '멀쩡한 할인'일 때만 유지 → 잠정 노출용. 아니면 None.
                if lst and lst > cur:
                    discount = (lst - cur) / lst
                    if discount > config.PROVISIONAL_MAX_DISCOUNT:
                        lst = None
                else:
                    lst = None
                disc = (lst - cur) / lst if lst else 0.0
                seen_pid.add(pid)
                by_cat.setdefault(slug, []).append((disc, vol, RawDeal(
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

    # 카테고리별 '판매량 상위' N개씩을 추적 풀로 반환(가격이력 수집).
    #   → 이 중 detect가 '진짜 급락'만 화면에 띄움. 나머진 추적만.
    #   (판매량 순으로 뽑아야 베스트셀러라 목록이 안정적 → 이력이 잘 쌓임)
    deals: list[RawDeal] = []
    summary = []
    for slug, bucket in by_cat.items():
        bucket.sort(key=lambda t: t[1], reverse=True)  # 판매량 내림차순
        picked = [rd for _, _, rd in bucket[: config.ALIEXPRESS_TRACK_PER_CATEGORY]]
        deals.extend(picked)
        summary.append(f"{slug}:{len(picked)}")
    print(f"[aliexpress] 추적 {len(deals)}건 (인기 상품, 카테고리별: {', '.join(summary)})")
    return deals
