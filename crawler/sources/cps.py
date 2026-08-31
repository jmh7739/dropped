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
import affiliate
from .base import RawDeal

API = "https://api.linkprice.com/ci/product/data/{aid}"

# list_ 카테고리 → 우리 slug (recommend는 혼합이라 상품명으로 재분류)
_CAT_SLUG = {
    "list_recommend": "living",
    "list_fashion": "fashion",
    "list_food": "food",
    "list_digital": "digital",
    "list_beauty": "beauty",
    "list_baby": "baby",
    "list_book": "books",
}

# 상품명 키워드 → 우리 slug (위에서부터 우선). recommend 혼합 목록을 실제 카테고리로.
_KW_SLUG = [
    (("기저귀", "분유", "물티슈", "유아", "아기", "젖병", "치발기", "베베", "키즈", "아동"), "baby"),
    (("비타민", "홍삼", "영양제", "유산균", "콜라겐", "프로틴", "오메가", "루테인",
      "마그네슘", "밀크씨슬", "글루코사민", "프로폴리스"), "health"),
    (("노트북", "마우스", "키보드", "모니터", "ssd", "usb", "그래픽카드", "rtx",
      "cpu", "조립pc", "게이밍pc", "공유기", "웹캠", "ram", "메모리"), "digital"),
    (("갤럭시", "아이폰", "버즈", "케이스", "보조배터리", "태블릿", "아이패드", "충전기"), "mobile"),
    (("냉장고", "세탁기", "청소기", "에어프라이어", "가습기", "선풍기", "드라이어",
      "면도기", "에어컨", "정수기", "밥솥", "인덕션", "건조기", "tv", "티비", "모니터암"), "appliance"),
    (("셔츠", "팬츠", "니트", "코트", "원피스", "운동화", "신발", "슬리퍼", "백팩",
      "가방", "지갑", "양말", "속옷", "언더웨어", "브라", "드로즈", "맨투맨", "후드",
      "청바지", "자켓", "패딩", "레깅스", "에코백", "모자", "벨트"), "fashion"),
    (("스킨", "로션", "크림", "세럼", "에센스", "마스크팩", "선크림", "쿠션", "립",
      "향수", "샴푸", "클렌징", "파운데이션", "틴트", "미스트", "앰플", "토너"), "beauty"),
    (("캠핑", "텐트", "등산", "자전거", "골프", "요가", "덤벨", "낚시", "헬스", "런닝", "트레킹"), "sports"),
    (("멸치", "오징어", "쌀", "김치", "라면", "과자", "견과", "커피", "육포", "어묵",
      "떡", "반찬", "갈비", "고기", "햄", "소시지", "우유", "음료", "콜라", "버거",
      "치킨", "피자", "도넛", "던킨", "빵", "초콜릿", "젤리", "사탕", "젓갈", "명란",
      "꿀", "즙", "차 ", "티백", "생수", "간식", "찜", "탕", "국", "건어물", "황태", "쥐포", "곱창"), "food"),
    (("사료", "고양이", "강아지", "반려", "애견", "캐츠", "세제", "휴지", "청소",
      "수납", "주방", "냄비", "프라이팬", "세탁", "건조대", "정리", "밀폐", "텀블러", "그릇"), "living"),
]


def _slug_by_name(name: str) -> str | None:
    lower = name.lower()
    for kws, slug in _KW_SLUG:
        if any(kw.lower() in lower for kw in kws):
            return slug
    return None


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
            mall = affiliate.merchant_name(mcode)
            for p in items:
                price = _to_int(p.get("p_price"))
                url = p.get("target_url", "")
                if not price or not url:
                    continue
                name = p.get("p_name", "")
                img = p.get("img_url", "")
                # recommend 혼합 목록은 상품명으로 실제 카테고리 판정(전부 생활 방지)
                item_slug = _slug_by_name(name) or slug or "living"
                # 추천 특가는 popular 소스(할인율 있는 것)가 담당 → cps는 추적 풀만.
                curated = False
                deals.append(RawDeal(
                    platform="cps",
                    external_product_id=str(p.get("p_code")),
                    title=name,
                    image_url=img,
                    product_url=url,
                    affiliate_url=url,   # 이미 우리 제휴ID 포함
                    current_price=price,
                    list_price=None,     # 정가 없음 → 이력으로 판정
                    category_slug=item_slug,
                    mall_name=mall,
                    curated=curated,
                ))

    malls = sorted({d.mall_name for d in deals})
    print(f"[cps] {len(deals)}건 수집 ({', '.join(malls) or '없음'}) — 이력 쌓는 중")
    return deals
