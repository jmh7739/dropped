"""상품 분류/브랜드/표시 제목 정규화.

원칙:
- 상품 핵심명/상품군 > 명확한 카테고리 키워드 > 안전한 브랜드 힌트 > 소스 카테고리 > 기타
- 몰 이름, NEW/BEST/특가 같은 프로모션 문구는 분류 근거로 쓰지 않는다.
- 확실하지 않으면 브랜드는 None, 카테고리는 source_slug 또는 living 폴백.
"""
from __future__ import annotations

import re
from typing import Iterable


PROMO_RE = re.compile(
    r"(\[[^\]]*\]|\([^)]*\)|NEW\s*패턴|\bNEW\b|\bBEST\b|\bHOT\b|깜짝\s*특가|초특가|단독\s*특가|"
    r"한정\s*특가|오늘의\s*특가|균일가|기획\s*특가|무료\s*배송|사은품\s*증정|"
    r":\s*(롯데\s*ON|롯데온|G\s*마켓|지마켓|옥션|11번가|위메프|인터파크|SSG|쓱|오늘의집|하이마트|쿠팡)\s*$)",
    re.IGNORECASE,
)


def clean_title(title: str) -> str:
    text = PROMO_RE.sub(" ", title or "")
    text = re.sub(r"\s+", " ", text).strip(" :·-_\t\r\n")
    return text or (title or "").strip()


def _has(text: str, keywords: Iterable[str]) -> bool:
    for keyword in keywords:
        key = keyword.lower()
        # 짧은 일반어의 단순 부분문자열은 다른 단어 안에서도 잡힌다.
        # 예: 인생수업→생수, 제브라→브라, 책상→책.
        if key == "생수":
            if re.search(r"(?<![가-힣])생수(?![가-힣])", text):
                return True
            continue
        if key == "브라":
            if re.search(r"(?:^|[^가-힣])브라(?:$|[^가-힣])|(?:스포츠|노와이어|와이어|수유)브라|브라(?:탑|렛|세트)", text):
                return True
            continue
        if key == "책":
            if re.search(r"(?:그림|동화|요리|공부|전자)책|책(?:\s|$|세트|추천|읽기)", text):
                return True
            continue
        if key == "고기":
            if re.search(r"(?<!물)고기(?!능)", text):
                return True
            continue
        if key == "버터":
            if re.search(r"버터(?!플라이)", text):
                return True
            continue
        if key == "만화":
            if re.search(r"만화(?:책|도서|단행본|전집)|코믹스", text):
                return True
            continue
        if key in text:
            return True
    return False


# 상품군: 브랜드보다 먼저 본다. 예: 롯데온 생활 추천 목록 안의 우동/사이다/참치.
PRODUCT_GROUPS: list[tuple[tuple[str, ...], str]] = [
    (("기저귀", "분유", "물티슈", "유아", "아기", "젖병", "치발기", "베베", "키즈", "아동"), "baby"),
    (("비타민", "홍삼", "영양제", "보충제", "유산균", "콜라겐", "프로틴", "오메가", "루테인",
      "마그네슘", "밀크씨슬", "글루코사민", "프로폴리스", "지방 연소"), "health"),
    (("노트북", "키보드", "마우스", "모니터", "ssd", "그래픽카드", "rtx", "cpu",
      "조립pc", "게이밍pc", "공유기", "웹캠", "ram", "메모리", "이어폰", "헤드폰",
      "헤드셋", "스피커", "mp3 플레이어", "오디오 플레이어"), "digital"),
    (("갤럭시", "아이폰", "버즈", "에어팟", "폰케이스", "휴대폰케이스", "핸드폰케이스",
      "보조배터리", "태블릿", "아이패드", "충전기"), "mobile"),
    (("냉장고", "세탁기", "청소기", "에어프라이어", "전자레인지", "가습기", "선풍기",
      "드라이어", "면도기", "에어컨", "정수기", "밥솥", "인덕션", "건조기", "히터", "티비",
      "모니터암"), "appliance"),
    (("신발", "운동화", "러닝화", "런닝화", "워킹화", "스니커즈", "슈즈", "로퍼", "부츠",
      "구두", "샌들", "크록스", "워커", "단화", "트레킹화", "등산화", "p-6000", "cd6404"), "fashion"),
    (("속옷", "언더웨어", "브라", "드로즈", "박서", "팬티", "트렁크", "내복", "홈웨어",
      "잠옷", "파자마"), "fashion"),
    (("셔츠", "팬츠", "니트", "코트", "원피스", "백팩", "가방", "지갑", "양말", "맨투맨",
      "후드", "청바지", "자켓", "재킷", "패딩", "레깅스", "에코백", "모자", "벨트",
      "슬랙스", "조거", "트레이닝", "가디건", "블라우스", "스커트", "점퍼", "파카",
      "바람막이", "플리스", "집업", "데님", "반팔", "긴팔", "반바지", "티셔츠", "폴로",
      "정장", "머플러", "목도리", "스카프", "선글라스", "캐리어", "손목시계", "고어텍스",
      "다운자켓", "다운재킷", "히팅다운", "1bypaw", "블랙야크"), "fashion"),
    (("스킨", "로션", "크림", "세럼", "에센스", "마스크팩", "선크림", "쿠션팩트",
      "립스틱", "립밤", "립글로스", "립틴트", "향수", "샴푸", "클렌징", "파운데이션",
      "틴트", "미스트", "앰플", "토너", "세타필"), "beauty"),
    (("캠핑", "텐트", "등산", "자전거", "골프", "요가", "덤벨", "낚시", "헬스", "트레킹"), "sports"),
    (("라면", "우동", "하이면", "냉면", "쫄면", "국수", "쌀", "김치", "과자", "크래커", "비스킷",
      "비스켓", "쿠키", "와플", "하임", "파이", "스낵", "포카칩", "고래밥", "초코송이",
      "양파링", "바나나킥", "자갈치", "새우깡", "다이제", "미주라", "통밀", "도너츠",
      "도넛", "던킨", "빵", "초콜릿", "초코", "젤리", "사탕", "시리얼", "그래놀라",
      "아이스크림", "붕어싸만코", "빵또아", "시모나", "구구", "크러스터", "빙그레",
      "참치", "참치캔", "통조림", "즉석밥", "컵밥", "밀키트", "샤브샤브", "만두", "갈비",
      "고기", "닭가슴살", "음료", "콜라", "사이다", "스프라이트", "탄산", "주스", "생수",
      "커피", "원두", "두유", "요거트", "치즈", "버터", "과일", "사과", "포도", "감귤",
      "귤", "딸기", "수박", "멜론", "복숭아", "샤인머스켓"), "food"),
    (("책", "도서", "소설", "에세이", "만화", "교재", "잡지", "전집", "문고", "출판"), "books"),
    (("세제", "섬유유연제", "리큐", "르샤트라", "휴지", "청소", "수납", "주방", "냄비",
      "프라이팬", "세탁", "건조대", "정리", "밀폐", "텀블러", "그릇", "사료", "고양이",
      "강아지", "반려", "애견"), "living"),
]


BRAND_TO_SLUG = {
    "fashion": (
        "나이키", "nike", "p-6000", "cd6404", "아디다스", "adidas", "뉴발란스", "new balance",
        "아식스", "asics", "퓨마", "puma", "컨버스", "converse", "블랙야크", "blackyak",
        "black yak", "1bypaw", "노스페이스", "north face", "프로스펙스", "스케쳐스", "skechers",
    ),
    "food": ("오리온", "농심", "빙그레", "동원", "미주라", "던킨", "롯데웰푸드"),
    "beauty": ("세타필", "미샤", "아벤느"),
}

# 뷰티의 일반 키워드 "크림"보다 먼저 보아야 하는 명확한 식품명.
# 예: "아이스크림", "크림 파스타"가 뷰티로 오분류되는 경우를 막는다.
STRONG_FOOD_KEYWORDS = (
    "아이스크림", "아이스 크림", "파스타", "스파게티", "마카로니", "페투치네",
    "파르팔레", "페네", "노끼", "라자냐", "파스타소스", "떡볶이",
    "크림빵", "생크림", "휘핑크림", "크림치즈",
    "구미 젤리", "구미 선물", "구미 캔디",
)

STRONG_BOOK_KEYWORDS = (
    "요리책", "레시피북", "문제집", "수험서", "모의고사", "교재", "참고서",
    "소설", "에세이", "전집", "그림책", "동화책", "전자책", "e북", "단행본",
)

LIVING_ACCESSORY_KEYWORDS = (
    "냉장고 자석", "냉장고자석", "형광펜", "볼펜", "멀티펜", "만년필", "샤프펜슬", "연필", "지우개",
    "문구세트", "책갈피", "아크릴 굿즈", "포토카드 홀더",
    "요거트 필터", "요거트 스트레이너", "소시지 메이커", "나이프 보관", "나이프 케이스",
    "커피 필터", "커피 탬퍼", "포터필터", "커피 스케일", "드리퍼", "스터디 타이머", "몰입 타이머",
)

BOOK_MERCHANTS = ("yes24", "예스24", "교보문고", "알라딘")


def classify_slug(title: str, source_slug: str | None = None, merchant: str | None = None) -> str:
    lower = clean_title(title).lower()
    merchant_key = (merchant or "").strip().lower()
    if _has(lower, STRONG_BOOK_KEYWORDS):
        return "books"
    if _has(lower, LIVING_ACCESSORY_KEYWORDS):
        return "living"
    if _has(lower, STRONG_FOOD_KEYWORDS):
        return "food"
    for keywords, slug in PRODUCT_GROUPS:
        if _has(lower, keywords):
            return slug
    for slug, brands in BRAND_TO_SLUG.items():
        if _has(lower, brands):
            return slug
    if merchant_key in BOOK_MERCHANTS:
        return "books"
    return source_slug or "living"


BRAND_DICT: list[tuple[str, tuple[str, ...]]] = [
    ("블랙야크", ("blackyak", "black yak", "블랙야크", "1bypaw")),
    ("나이키", ("nike", "나이키", "p-6000", "cd6404")),
    ("뉴발란스", ("new balance", "뉴발란스")),
    ("아디다스", ("adidas", "아디다스")),
    ("아식스", ("asics", "아식스")),
    ("스케쳐스", ("skechers", "스케쳐스", "스케처스")),
    ("프로스펙스", ("prospecs", "프로스펙스")),
    ("미주라", ("misura", "미주라")),
    ("농심", ("농심",)),
    ("빙그레", ("빙그레",)),
    ("동원", ("동원",)),
    ("오리온", ("오리온",)),
    ("세타필", ("cetaphil", "세타필")),
    ("미샤", ("missha", "미샤")),
]


def brand_from(title: str | None) -> str | None:
    lower = clean_title(title or "").lower()
    for name, variants in BRAND_DICT:
        if _has(lower, variants):
            return name
    return None


def display_title(title: str) -> str:
    t = clean_title(title)
    brand = brand_from(t)
    if brand and brand.lower() not in t.lower():
        t = f"{brand} {t}"
    return re.sub(r"\s+", " ", t).strip()
