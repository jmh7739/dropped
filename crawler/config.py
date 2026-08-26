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
ALIEXPRESS_PAGES = 4       # 키워드당 페이지 수(페이지당 50) — 후보풀 확대
# 전략: '인기 상품'을 넓게 추적(가격이력 수집)하고, 노출은 '진짜 급락'만.
ALIEXPRESS_MIN_VOLUME = 50     # 최소 판매량(잡템만 제외) — 추적 풀 넓힘
ALIEXPRESS_TRACK_PER_CATEGORY = 80  # 카테고리별 추적 풀(판매량 상위 N개, 화면엔 안 떠도 가격 수집)
# 카테고리(slug)별 키워드. 카테고리마다 조금씩이라도 딜이 뜨도록 분산.
#   slug은 lib/types.ts CATEGORIES와 일치. (상품권/소프트웨어는 알리에 없어 제외)
ALIEXPRESS_KEYWORDS_BY_CAT = {
    "digital": ["usb 허브", "기계식 키보드", "무선 마우스", "게이밍 마우스패드",
                "노트북 거치대", "웹캠", "블루투스 스피커", "액션캠", "삼각대",
                "무선 키보드", "hdmi 케이블", "노트북 쿨러", "ssd 케이스"],
    "mobile": ["무선이어폰", "보조배터리", "스마트워치", "휴대폰 거치대",
               "차량용 충전기", "스마트 태그", "폰 그립톡", "무선 충전기",
               "폰 케이스", "셀카봉", "휴대폰 렌즈"],
    "appliance": ["미니 선풍기", "가습기", "전기 포트", "무선 청소기",
                  "헤어 드라이어", "커피 그라인더", "led 조명", "전기 그릴",
                  "미니 제습기", "탁상 램프", "무드등"],
    "living": ["주방 용품", "수납 정리함", "프라이팬", "텀블러", "공구 세트",
               "욕실 용품", "수납 박스", "여행 용품", "밀폐용기", "청소 용품",
               "옷걸이", "실리콘 주방"],
    # 식품은 '먹는 것'만 — 커피 기구류는 가전으로 뺌(오분류 방지)
    "food": ["견과류", "비타민", "홍삼", "단백질 보충제", "영양제", "건강 차",
             "프로틴바", "콜라겐", "유산균", "다이어트 보조제"],
    "fashion": ["백팩", "지갑", "벨트", "양말", "모자", "선글라스", "스카프",
                "캐리어", "크로스백", "장갑", "후드티", "손목시계"],
    "beauty": ["마스크팩", "메이크업 브러시", "네일 스티커", "화장품 파우치",
               "헤어 액세서리", "향수", "립밤", "클렌징", "뷰티 디바이스"],
    "baby": ["아기 장난감", "유아 식기", "유아 목욕 용품", "아기 턱받이",
             "아기 옷", "젖병", "유아 매트", "아기 물티슈"],
    "sports": ["캠핑 랜턴", "캠핑 용품", "요가 매트", "자전거 용품", "등산 스틱",
               "헬스 밴드", "덤벨", "폼롤러", "골프 용품", "낚시 용품"],
}

# ── 링크프라이스(CPS: G마켓·11번가·위메프 등 국내몰 통합 제휴) ──
LINKPRICE_AFFILIATE_ID = os.getenv("LINKPRICE_AFFILIATE_ID", "")

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
MIN_HISTORY_POINTS = 6          # 최소 수집 횟수
MIN_HISTORY_DAYS = 3            # 최소 관찰 기간(일). 둘 다 충족해야 확정

MIN_DISCOUNT = 0.20             # 평소가 대비: 이 이상 하락해야 딜 (20%)
# 알리 전용 '잠정' 노출 밴드(정가 대비). 뻥튀기 정가를 감안해 '아주 깊은' 할인만.
#   하한: 이 이상이어야 노출 / 상한: 이보다 깊으면 오류·사기성 의심으로 컷.
# 잠정 노출은 '아주 깊은' 할인만(콜드스타트용). 이력 쌓이면 평균가 대비로 승격.
PROVISIONAL_MIN_DISCOUNT = 0.50 # 정가 대비 50%+ 만 잠정 노출 (진짜 핫딜만)
PROVISIONAL_MAX_DISCOUNT = 0.85 # 정가 대비 85% 초과는 컷(오류/미끼 방지)
MIN_PRICE = 1000               # 이 미만은 수집오류로 간주하고 컷
ERROR_SUSPECT_DISCOUNT = 0.70   # 70~90% → 가격오류 "의심" 뱃지
ERROR_HARD_CUT_DISCOUNT = 0.90  # 90% 초과 → 자동 노출 보류 (버그 확률↑)

# 딜 종료 판정: 현재가가 기준가 대비 이 하락률 미만으로 원복되면 종료
END_DISCOUNT = 0.10

# 크롤링 매너 (직접 크롤링 시)
REQUEST_DELAY_RANGE = (2, 5)    # 요청 간 랜덤 딜레이(초)

# DRY_RUN: Supabase 미연결이면 True → 수집은 하되 DB 기록은 건너뜀
DRY_RUN = not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
