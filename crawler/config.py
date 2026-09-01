"""수집·탐지 임계값 및 환경설정."""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    # 실행 위치와 무관하게 crawler/.env 를 읽음
    load_dotenv(Path(__file__).with_name(".env"))
except ImportError:
    pass  # dotenv 미설치 시 시스템 환경변수만 사용

# ── Supabase (쓰기: service_role 키 필요) ──────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ── 쿠팡 파트너스 ─────────────────────────────────────────────
COUPANG_ACCESS_KEY = os.getenv("COUPANG_ACCESS_KEY", "")
COUPANG_SECRET_KEY = os.getenv("COUPANG_SECRET_KEY", "")
# 후보 확장: 특가(골드박스) + 베스트카테고리 랭킹. 스캔할 카테고리ID + 개수.
# 카테고리ID: 1010뷰티 1011출산유아 1012식품 1013주방 1014생활 1015홈 1016가전디지털
#            1017스포츠 1020완구 1024헬스 1029반려 (쿠팡 파트너스 문서 기준)
COUPANG_BEST_CATEGORIES = [1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1024, 1029]
COUPANG_BEST_LIMIT = 50   # 카테고리당 상위 N개 (콜/쿼터 고려해 조절)

# ── 알리익스프레스 ────────────────────────────────────────────
ALIEXPRESS_APP_KEY = os.getenv("ALIEXPRESS_APP_KEY", "")
ALIEXPRESS_APP_SECRET = os.getenv("ALIEXPRESS_APP_SECRET", "")
ALIEXPRESS_TRACKING_ID = os.getenv("ALIEXPRESS_TRACKING_ID", "")
ALIEXPRESS_PAGES = 2       # 선택된 키워드당 페이지 수(페이지당 50)
# 발견용 키워드는 시간별로 순환한다. 217개 전부를 매시간 호출하지 않아
# API 쿼터를 지키면서도 한 사이클(약 9시간)마다 모든 키워드를 다시 확인한다.
# 전체 키워드를 매 실행 스캔(로테이션 사실상 해제) → 지금 싼 것을 최대한 많이 포착.
#   공개 레포라 GitHub Actions 무제한, 알리 쿼터도 여유. 1회 ~15분(1시간 크론 내).
ALIEXPRESS_DISCOVERY_KEYWORDS_PER_RUN = 250
# API의 고정 추천 테마. 한국 배송 가능 상품만 받아 안정적인 가격추적 풀을 만든다.
ALIEXPRESS_FEATURED_PROMOS = [
    "DS_ConsumerElectronics_bestsellers",
    "DS_Home&Kitchen_bestsellers",
    "DS_Beauty_bestsellers",
    "DS_Sports&Outdoors_bestsellers",
]
ALIEXPRESS_PROMO_PAGES = 1
ALIEXPRESS_MIN_EVALUATE_RATE = 90.0  # 평점 응답이 있는 상품은 90% 미만 제외
ALIEXPRESS_MAX_DELIVERY_DAYS = 10
# 전략: 공식 캠페인/베스트셀러를 우선 추적하고, 순환 키워드로 후보를 확장한다.
ALIEXPRESS_MIN_VOLUME = 50     # 최소 판매량(잡템만 제외) — 추적 풀 넓힘
# 식품/건강은 원래 판매량이 낮음(가전 기준 적용하면 다 잘림) → 낮은 기준
ALIEXPRESS_MIN_VOLUME_FOOD = 10
ALIEXPRESS_TRACK_PER_CATEGORY = 200  # 카테고리별 추적 풀(판매액 상위 N개, 화면엔 안 떠도 가격 수집)
# 카테고리(slug)별 키워드. 카테고리마다 조금씩이라도 딜이 뜨도록 분산.
#   slug은 lib/types.ts CATEGORIES와 일치. (상품권/소프트웨어는 알리에 없어 제외)
#   '사람들이 많이 사는 인기·고수요템' 위주. 크론 1시간이라 런타임 여유 → 대폭 확대.
ALIEXPRESS_KEYWORDS_BY_CAT = {
    "digital": ["기계식 키보드", "무선 마우스", "게이밍 마우스", "마우스패드",
                "usb 허브", "노트북 거치대", "웹캠", "블루투스 스피커", "액션캠",
                "삼각대", "무선 키보드", "hdmi 케이블", "노트북 쿨러", "ssd 케이스",
                "모니터 받침대", "그래픽 태블릿", "캡처보드", "usb 메모리", "sd카드",
                "마이크", "게임패드", "미니pc", "키보드 손목받침", "led 스트립",
                "노트북 파우치"],
    "mobile": ["무선이어폰", "보조배터리", "스마트워치", "휴대폰 거치대",
               "차량용 충전기", "스마트 태그", "폰 그립톡", "무선 충전기",
               "폰 케이스", "셀카봉", "휴대폰 렌즈", "강화유리 필름", "c타입 케이블",
               "고속 충전기", "태블릿 케이스", "스마트밴드", "갤럭시 케이스",
               "아이폰 케이스", "차량용 거치대", "휴대폰 스트랩"],
    "appliance": ["미니 선풍기", "가습기", "전기 포트", "무선 청소기",
                  "헤어 드라이어", "커피 그라인더", "led 조명", "전기 그릴",
                  "미니 제습기", "무드등", "전동 칫솔", "안마기", "마사지건",
                  "전기 면도기", "고데기", "핸디 선풍기", "미니 냉장고", "이발기",
                  "코털 제거기", "발 마사지기", "손 선풍기", "usb 가습기"],
    "living": ["주방 용품", "수납 정리함", "프라이팬", "텀블러", "공구 세트",
               "욕실 용품", "수납 박스", "여행 용품", "밀폐용기", "청소 용품",
               "옷걸이", "실리콘 주방", "도마", "주방 칼", "물걸레", "압축팩",
               "냄비", "커튼", "러그", "디퓨저", "우산", "강아지 용품",
               "고양이 용품", "차량 용품", "정리 후크", "빨래 건조대", "칫솔걸이",
               "냉장고 정리", "리모컨 거치대"],
    # 식품 = 진짜 먹거리만 (기구·보충제 제외 → _our_slug가 보충제는 health로 뺌)
    #   검증된 키워드 위주 (콜라·시리얼·통조림 등 식품 0건 단어는 제외).
    "food": ["견과", "안주", "간식", "김치", "오징어", "떡", "건어물", "반찬",
             "과자", "라면", "젤리", "곱창", "고기", "닭가슴살", "떡볶이", "어묵",
             "갈비", "황태", "쥐포"],
    # 건강/보충제 = 먹는 영양제류 (진짜 식품과 분리)
    "health": ["비타민", "홍삼", "단백질 보충제", "영양제", "콜라겐", "유산균",
               "오메가3", "루테인", "밀크씨슬", "마그네슘", "프로폴리스",
               "다이어트 보조제", "프로틴바", "아연", "비오틴", "칼슘", "철분",
               "종합비타민", "크레아틴", "흑염소"],
    "fashion": ["백팩", "지갑", "벨트", "양말", "모자", "선글라스", "스카프",
                "캐리어", "크로스백", "장갑", "후드티", "손목시계", "원피스",
                "니트", "코트", "패딩", "운동화", "슬리퍼", "레깅스", "청바지",
                "셔츠", "목도리", "귀걸이", "목걸이", "에코백"],
    "beauty": ["마스크팩", "메이크업 브러시", "네일 스티커", "화장품 파우치",
               "헤어 액세서리", "향수", "립밤", "클렌징", "뷰티 디바이스", "선크림",
               "쿠션 팩트", "틴트", "아이섀도우", "매니큐어", "헤어핀", "눈썹칼",
               "페이스롤러", "파운데이션", "미스트"],
    "baby": ["아기 장난감", "유아 식기", "유아 목욕 용품", "아기 턱받이",
             "아기 옷", "젖병", "유아 매트", "아기 물티슈", "유아 신발", "인형",
             "블록 장난감", "아기 모자", "유아 수저", "기저귀 가방", "아기 손수건",
             "유아 칫솔", "치발기", "아기 양말"],
    "sports": ["캠핑 랜턴", "캠핑 용품", "요가 매트", "자전거 용품", "등산 스틱",
               "헬스 밴드", "덤벨", "폼롤러", "골프 용품", "낚시 용품", "캠핑 의자",
               "아이스박스", "줄넘기", "요가복", "수영복", "등산 가방", "캠핑 테이블",
               "스포츠 물통", "트레킹화", "손목 보호대"],
}

# ── 링크프라이스(CPS: G마켓·11번가·위메프 등 국내몰 통합 제휴) ──
LINKPRICE_AFFILIATE_ID = os.getenv("LINKPRICE_AFFILIATE_ID", "A100707159")
# auth_key는 비밀값(실적조회용) → 하드코딩 금지. 공개 레포 유출 방지 위해 env로만.
LINKPRICE_AUTH_KEY = os.getenv("LINKPRICE_AUTH_KEY", "")

# ── 네이버 쇼핑 검색 API (후보 발굴용, 커넥트 프로그램 키) ──────
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")
NAVER_DISPLAY = 100       # 키워드당 가져올 상품 수 (최대 100)
# 후보를 넓힐 키워드(카테고리/인기어). 일 25,000콜 한도 내에서 조절.
NAVER_KEYWORDS = [
    "노트북", "무선이어폰", "기계식키보드", "모니터", "SSD",
    "로봇청소기", "공기청정기", "에어프라이어", "전기면도기",
    "기저귀", "분유", "물티슈",
    "홍삼", "비타민", "단백질보충제",
    "운동화", "백팩", "캠핑의자",
]

# ── 항공권: Travelpayouts(아비아세일즈) 실 요금 API + 어필리에이트 ──
TRAVELPAYOUTS_TOKEN = os.getenv("TRAVELPAYOUTS_TOKEN", "")
TRAVELPAYOUTS_MARKER = os.getenv("TRAVELPAYOUTS_MARKER", "")
FLIGHT_MONTHS = 6            # 다음 N개월 조회(날짜 다양성) — 넓게
FLIGHT_DATES_PER_ROUTE = 10  # 노선별 최저가 상위 N개 날짜 유지
FLIGHT_SCAN_INTERVAL_HOURS = 3  # 항공은 캐시 요금이라 이 간격보다 자주 안 돎(쿼터 절약)
# 해외는 당일치기/1박2일이 비현실적 → 최소 숙박수 필터(지역별). 국내는 제한 없음(당일치기 OK).
FLIGHT_MIN_NIGHTS = {        # 근거리 아시아 2박+, 장거리 4박+
    "일본": 2, "중화권": 2, "동남아": 2,
    "유럽": 4, "미주": 4, "오세아니아": 4, "중동": 4,
}
FLIGHT_MAX_NIGHTS = 30       # 한 달 초과는 특가 왕복으로 비현실적 → 제외

# ── 경매: 공공데이터포털(data.go.kr) 서비스키 ─────────────────
#   차세대 온비드 물건목록(부동산/자동차) 조회서비스. 키는 URL-decode된 원본.
DATA_GO_KR_KEY = os.getenv("DATA_GO_KR_KEY", "")
# 재산유형코드(복수, 쉼표): 0007압류 0005기타일반 0006유입 0008수탁 0010국유 0011공공개발
AUCTION_PROPERTY_DIVS = "0007,0005,0006,0008,0010,0011"
AUCTION_ROWS = 100         # 페이지당 결과 수
AUCTION_PAGES = 5          # 자산유형별 페이지 수(넓게)
AUCTION_MIN_FAILS = 1      # 최소 유찰횟수(회차마다 가격 하락) — API usbdNftStart
# 자산유형별 (오퍼레이션·하락률임계·노출상한). 자동차는 하락폭이 작아 임계 낮춤.
AUCTION_TYPES = {
    "부동산": {"path": "OnbidRlstListSrvc2/getRlstCltrList2",
             "min_drop": 0.35, "limit": 50},
    "자동차": {"path": "OnbidCarListSrvc2/getCarCltrList2",
             "min_drop": 0.18, "limit": 40},
}

# ── 탐지 임계값 (detect.py에서 사용) ──────────────────────────
BASELINE_WINDOW_DAYS = 90       # 평소 기준가 계산 기간(3개월). 데이터 쌓이면 이 창으로.
BASELINE_METHOD = "median"      # "median" | "mean"  (중앙값이 스파이크·오탐에 강함)

# 신뢰 우선: 확정 딜로 노출하려면 최소 이력이 있어야 함.
# 이력이 부족하면 '관찰중'으로 두고 가격만 계속 수집(정가 대비로는 확정 안 함).
# 실제 가격이력 대비로만 판정(정가 안 믿음). 백그라운드는 계속 수집, 노출은 '정말 싼 것'만.
MIN_HISTORY_POINTS = 6          # 최소 수집 횟수 (1시간 크론 → 약 6시간이면 충족)
MIN_HISTORY_DAYS = 1            # 최소 관찰 기간(일) — 최소 하루는 지켜봐야 '평소가'가 믿을 만
MIN_DISCOUNT = 0.05             # 평소가 대비 5%+ 하락하면 노출 ('어느정도 싸진 것'부터)
# 알리는 시점별 가격 노이즈가 커서(2~3일 이력에 소폭 하락 남발) 더 큰 하락만 인정.
MIN_DISCOUNT_ALI = 0.20         # 알리는 20%+ 하락해야 진짜 급락으로 노출
MIN_PRICE = 1000               # 이 미만은 수집오류로 간주하고 컷
# 가격 변동성 가드: 같은 상품인데 최고/최저가 이 배수 이상 널뛰면(알리 등 시점별
#   가격 불일치) baseline 오염 → 가짜 급락. 신뢰 불가로 보류한다.
MAX_PRICE_VOLATILITY = 2.0
# 상시 세일가 가드: 현재가(±EPSILON) 이하가 이력에서 이 비율 이상 등장하면
#   (알리 플래시세일이 켜졌다 꺼졌다 반복 등) '떨어졌다'가 아니라 '원래 가끔 이 가격'
#   → 급락에서 제외(보류). 진짜 급락은 현재가가 이력의 하위 소수(희소)일 때만.
RECURRING_LOW_FRACTION = 0.34   # 현재가 이하가 이력의 34%+에서 나오면 상시가로 간주
RECURRING_LOW_EPSILON = 0.03    # 현재가와 '같은 가격'으로 볼 오차범위(3%)
ERROR_SUSPECT_DISCOUNT = 0.70   # 70~90% → 가격오류 "의심" 뱃지
ERROR_HARD_CUT_DISCOUNT = 0.90  # 90% 초과 → 자동 노출 보류 (버그 확률↑)

# 딜 종료 판정: 현재가가 기준가 대비 이 하락률 미만으로 원복되면 종료.
#   MIN_DISCOUNT(5%)보다 낮아야 함(히스테리시스) — 안 그러면 5~9% 딜이 뜨자마자 종료됨.
END_DISCOUNT = 0.03
# 종료는 '최근 K개 수집이 모두 원복'됐을 때만 확정한다. (알리 bimodal이 잠깐 고가로
#   튀는 단일 blip으로 영구 종료되던 버그 방지 — 최근 K개 중 최저가로 판정)
END_CONFIRM_READINGS = 3

# 크롤링 매너 (직접 크롤링 시)
REQUEST_DELAY_RANGE = (2, 5)    # 요청 간 랜덤 딜레이(초)

# DRY_RUN: Supabase 미연결이면 True → 수집은 하되 DB 기록은 건너뜀
DRY_RUN = not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
