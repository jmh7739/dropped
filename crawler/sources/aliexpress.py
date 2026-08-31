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
            # 많이 팔린 순 → 실제 인기 상품(잡템 케이스·싸구려 아님). 핵심 필터.
            "sort": "LAST_VOLUME_DESC",
            "tracking_id": config.ALIEXPRESS_TRACKING_ID,
            # 한국 배송이 지나치게 오래 걸리는 상품은 후보에서 제외한다.
            "delivery_days": config.ALIEXPRESS_MAX_DELIVERY_DAYS,
        },
    )
    return _products(data, "aliexpress_affiliate_hotproduct_query_response")


def _products(data: dict | None, response_key: str) -> list[dict]:
    """Ali API별 응답 껍데기 차이를 흡수해 상품 배열만 반환한다."""
    try:
        result = data[response_key]["resp_result"]["result"]
        products = result["products"]["product"]
        return products if isinstance(products, list) else [products]
    except (KeyError, TypeError):
        return []


def _promo_query(promo_name: str, page_no: int) -> list[dict]:
    """공식 베스트셀러/주간딜 테마에서 한국 배송 가능 상품을 가져온다."""
    data = _call(
        "aliexpress.affiliate.featuredpromo.products.get",
        {
            "promotion_name": promo_name,
            "page_no": page_no,
            "page_size": 50,
            "target_currency": "KRW",
            "target_language": "ko",
            "country": "KR",
            "tracking_id": config.ALIEXPRESS_TRACKING_ID,
            "sort": "volumeDesc",
        },
    )
    return _products(
        data,
        "aliexpress_affiliate_featuredpromo_products_get_response",
    )


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
    if slug == "bh":  # 뷰티 & 헬스 → 제목에 보충제 힌트 있으면 건강, 아니면 뷰티
        title = p.get("product_title", "")
        return "health" if any(h in title for h in _SUPPLEMENT) else "beauty"
    # 알리 '식품' 카테고리라도 제목이 보충제면 건강으로 (견과류 등 진짜 먹거리만 food)
    if slug == "food":
        title = p.get("product_title", "")
        if any(h in title for h in _SUPPLEMENT):
            return "health"
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


def _evaluate_rate(p: dict) -> float | None:
    """'96.8%' 같은 응답을 숫자로. 미제공 상품은 None으로 유지한다."""
    value = p.get("evaluate_rate")
    if value is None:
        return None
    try:
        return float(str(value).replace("%", "").strip())
    except (TypeError, ValueError):
        return None


def _rotated_keywords() -> list[str]:
    """매 실행마다 키워드 일부만 순환해 호출량과 후보 다양성을 함께 확보한다."""
    keywords = [
        kw for kws in config.ALIEXPRESS_KEYWORDS_BY_CAT.values() for kw in kws
    ]
    if not keywords:
        return []
    size = min(config.ALIEXPRESS_DISCOVERY_KEYWORDS_PER_RUN, len(keywords))
    # GitHub Actions가 시간 단위로 실행되므로 같은 시간에는 같은 풀을 쓴다.
    slot = int(time.time() // 3600)
    start = (slot * size) % len(keywords)
    return [keywords[(start + i) % len(keywords)] for i in range(size)]


def fetch() -> list[RawDeal]:
    if not config.ALIEXPRESS_APP_KEY:
        print("[aliexpress] 키 없음 → 건너뜀")
        return []

    # 공식 베스트셀러/주간딜 테마를 우선 수집하고, 순환 키워드로 새 후보를 보충한다.
    # 분류는 상품의 실제 Ali 카테고리 기준이며, 카테고리별 상위 N개만 추적한다.
    seen_pid: set[str] = set()
    by_cat: dict[str, list[tuple[int, int, int, RawDeal]]] = {}
    promo_rows = 0
    keyword_rows = 0

    def consider(p: dict, featured: bool) -> None:
        """품질 필터를 통과한 상품을 카테고리별 후보 풀에 추가한다."""
        nonlocal promo_rows, keyword_rows
        pid = str(p.get("product_id"))
        if not pid or pid in seen_pid:
            return
        slug = _our_slug(p)
        if not slug:
            return
        cur = _to_int_won(p.get("target_sale_price"))
        vol = _volume(p)
        min_vol = (
            config.ALIEXPRESS_MIN_VOLUME_FOOD
            if slug in ("food", "health")
            else config.ALIEXPRESS_MIN_VOLUME
        )
        rating = _evaluate_rate(p)
        if vol < min_vol or cur <= 0:
            return
        if rating is not None and rating < config.ALIEXPRESS_MIN_EVALUATE_RATE:
            return
        url = p.get("product_detail_url", "")
        affiliate_url = p.get("promotion_link") or url
        if not url or not affiliate_url:
            return
        seen_pid.add(pid)
        deal = RawDeal(
            platform="aliexpress",
            external_product_id=pid,
            title=p.get("product_title", ""),
            image_url=p.get("product_main_image_url", ""),
            product_url=url,
            affiliate_url=affiliate_url,
            current_price=cur,
            list_price=None,   # 알리 정가는 뻥튀기 → 안 실음(실제 가격이력으로만 판정)
            category_slug=slug,
        )
        # 공식 캠페인을 우선하고, 그 안에서는 판매액이 큰 안정 상품을 고른다.
        by_cat.setdefault(slug, []).append((int(featured), vol * cur, vol, deal))
        if featured:
            promo_rows += 1
        else:
            keyword_rows += 1

    # 1) 알리 공식 추천 테마: 한국 배송 가능·고평가 베스트셀러 위주
    for promo in config.ALIEXPRESS_FEATURED_PROMOS:
        for page in range(1, config.ALIEXPRESS_PROMO_PAGES + 1):
            try:
                for p in _promo_query(promo, page):
                    consider(p, featured=True)
            except requests.RequestException as e:
                print(f"[aliexpress] 프로모션 '{promo}' 실패: {e}")
            time.sleep(0.4)

    # 2) 전체 키워드를 매시간 일부씩 순환: API 쿼터를 지키며 신규 후보 발굴
    keywords = _rotated_keywords()
    for kw in keywords:
        for page in range(1, config.ALIEXPRESS_PAGES + 1):
            try:
                for p in _query(kw, page):
                    consider(p, featured=False)
            except requests.RequestException as e:
                print(f"[aliexpress] 키워드 '{kw}' 실패: {e}")
            time.sleep(0.4)

    # 카테고리별 '판매량 상위' N개씩을 추적 풀로 반환(가격이력 수집).
    #   → 이 중 detect가 '진짜 급락'만 화면에 띄움. 나머진 추적만.
    #   (판매량 순으로 뽑아야 베스트셀러라 목록이 안정적 → 이력이 잘 쌓임)
    deals: list[RawDeal] = []
    summary = []
    for slug, bucket in by_cat.items():
        # 공식 캠페인 우선 → 판매액/판매량 순. $1 잡템보다 안정적인 고수요 상품을 추적.
        bucket.sort(key=lambda t: (t[0], t[1], t[2]), reverse=True)
        picked = [rd for _, _, _, rd in bucket[: config.ALIEXPRESS_TRACK_PER_CATEGORY]]
        deals.extend(picked)
        summary.append(f"{slug}:{len(picked)}")
    print(
        f"[aliexpress] 추적 {len(deals)}건 "
        f"(공식캠페인 {promo_rows}·순환키워드 {keyword_rows}, "
        f"키워드 {len(keywords)}개, 카테고리별: {', '.join(summary)})"
    )
    return deals
