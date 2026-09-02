"""링크프라이스 리얼핫딜 API — MD 큐레이션 핫딜.

GET https://api.linkprice.com/ci/hotdeal/data/{affiliate_id}
  → 전문 MD가 고른 핫딜 상품 목록(30분마다 갱신).
  → click_url에 우리 제휴ID가 이미 박혀 있어 그대로 쓰면 클릭 수익 연결.

주의:
- 정가(normal_price)는 상인이 주는 값이라 뻥튀기 가능 → 안 믿음(list_price=None).
  노출 판정은 오직 우리가 쌓는 '실제 가격이력' 대비로만(신뢰 우선, 다른 소스와 동일).
- discount_price는 실제로 거의 0으로 옴 → 현재가만 신뢰.
- category가 '식품·생활' 처럼 뭉뚱그려 오므로 상품명 키워드로 우리 slug 재분류.
- '참여'·'설치'(앱설치·가입 CPA)는 상품이 아니므로 제외.

키(LINKPRICE_AFFILIATE_ID)가 없으면 빈 목록.
"""
from __future__ import annotations
import requests

import config
import affiliate
from .base import RawDeal

API = "https://api.linkprice.com/ci/hotdeal/data/{aid}"

# 상품명 키워드 → 우리 slug (위에서부터 우선). 못 맞추면 living(생활)으로.
_KW_SLUG = [
    (("노트북", "키보드", "마우스", "모니터", "ssd", "충전기", "usb", "웹캠",
      "이어폰", "헤드폰", "태블릿", "그래픽", "공유기"), "digital"),
    (("냉장고", "세탁기", "청소기", "에어프라이어", "전자레인지", "가습기",
      "선풍기", "드라이어", "면도기", "정수기", "밥솥"), "appliance"),
    (("견과", "안주", "간식", "김치", "오징어", "라면", "젤리", "과자", "커피",
      "차 ", "건어물", "반찬", "고기", "즙", "음료", "쌀"), "food"),
    (("비타민", "홍삼", "영양제", "유산균", "콜라겐", "프로틴", "오메가", "루테인",
      "마그네슘", "글루코사민"), "health"),
    (("스킨", "로션", "에센스", "크림", "마스크팩", "선크림", "쿠션", "립", "향수",
      "샴푸", "클렌징", "네일", "미스트"), "beauty"),
    (("기저귀", "분유", "물티슈", "유아", "아기", "젖병", "장난감", "완구"), "baby"),
    (("캠핑", "텐트", "등산", "낚시", "자전거", "골프", "요가", "덤벨", "런닝",
      "스포츠"), "sports"),
    (("셔츠", "팬츠", "자켓", "코트", "니트", "원피스", "청바지", "백팩", "가방",
      "지갑", "신발", "운동화", "모자", "양말", "벨트", "패딩"), "fashion"),
    (("책", "도서", "소설", "에세이", "만화", "교재", "잡지", "전집", "문고",
      "북", "출판", "저자", "리더기", "전자책"), "books"),
]

# API category → 대략 slug 힌트 (키워드로 못 잡을 때 폴백)
_CAT_HINT = {
    "가전·디지털": "digital",
    "패션·뷰티": "fashion",
    "식품·생활": "living",
    "종합쇼핑몰": "living",
    "MD’S PICK": "living",
    "도서·여행": "books",
}
# 상품이 아닌 앱 설치/가입형만 제외한다.
_SKIP_CATEGORY = {"참여", "설치"}


def _to_int(v) -> int:
    try:
        return int(round(float(str(v).replace(",", ""))))
    except (TypeError, ValueError):
        return 0


def _slug(name: str, category: str) -> str | None:
    lower = name.lower()
    for kws, slug in _KW_SLUG:
        if any(kw.lower() in lower for kw in kws):
            return slug
    return _CAT_HINT.get(category)  # 폴백(없으면 None → 제외)


def fetch() -> list[RawDeal]:
    if not config.LINKPRICE_AFFILIATE_ID:
        print("[hotdeal] LINKPRICE_AFFILIATE_ID 없음 → 건너뜀")
        return []

    try:
        r = requests.get(API.format(aid=config.LINKPRICE_AFFILIATE_ID), timeout=20)
        r.raise_for_status()
        data = r.json()
    except (requests.RequestException, ValueError) as e:
        print(f"[hotdeal] 요청 실패: {e}")
        return []

    if not isinstance(data, list):
        print("[hotdeal] 예상과 다른 응답 → 건너뜀")
        return []

    deals: list[RawDeal] = []
    for p in data:
        category = p.get("category", "")
        if category in _SKIP_CATEGORY:
            continue
        name = p.get("product_name", "")
        slug = _slug(name, category)
        if not slug:
            continue
        # 리얼핫딜은 우리 등급엔 discount_price를 안 줌(항상 0) → normal_price(현재가)만.
        #   즉 정가/할인가 없음 → 실이력으로만 판정(product API와 동일).
        disc = _to_int(p.get("discount_price"))
        normal = _to_int(p.get("normal_price"))
        price = disc if disc > 0 else normal

        # 배송비 정보 추가
        shipping = p.get("shipping_charge", "")
        shipping_fee = 0 if shipping and "무료" in shipping else None
        url = p.get("click_url", "")
        if not price or not url:
            continue
        mcode = p.get("merchant_id", "")
        deals.append(RawDeal(
            platform="cps",
            external_product_id=f"hd_{mcode}_{p.get('product_code')}",
            title=name,
            image_url=p.get("product_image", ""),
            product_url=url,
            affiliate_url=url,   # 이미 우리 제휴ID 포함
            current_price=price,
            list_price=None,     # 할인가 없음 → 실이력으로만 판정
            category_slug=slug,
            mall_name=affiliate.merchant_name(mcode),
            shipping_fee=shipping_fee,
        ))

    malls = sorted({d.mall_name for d in deals})
    print(f"[hotdeal] {len(deals)}건 수집 ({', '.join(malls) or '없음'}) — 이력 쌓는 중")
    return deals
