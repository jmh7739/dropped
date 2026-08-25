# 떨어졌다 — 가격 급락 핫딜 큐레이션

평소보다 급락한 특가만 자동으로 모아 보여주는 사이트. 뽐뿌·펨코처럼 "특가만"
큐레이션하되, 다나와식 **가격 변동 그래프**와 **평균 대비 하락률**로 "진짜 싼지"를
한눈에 보여주는 게 차별점입니다.

## 구성

```
핫딜/
├─ app/                 Next.js(App Router) 프론트엔드
│  ├─ page.tsx          홈: 카테고리 탭 + 하락률순/최신순 + 딜 카드
│  └─ deal/[id]/page.tsx 상세: 가격 그래프 + 제휴 링크
├─ components/          UI 컴포넌트 (카드/뱃지/그래프/탭)
├─ lib/                 타입·포맷·Supabase 클라이언트·데이터접근(목 폴백)
├─ db/schema.sql        Supabase 스키마 + 카테고리 시드 + 롤업 함수
├─ crawler/             Python 수집기
│  ├─ run.py            오케스트레이터 (수집→판정→종료처리→롤업)
│  ├─ detect.py         이상탐지 · 가격오류 가드레일 · 딜 판정
│  ├─ db.py             Supabase 읽기/쓰기 (DRY_RUN 시뮬레이션)
│  └─ sources/          coupang / aliexpress 특가 수집기
└─ .github/workflows/crawl.yml  3시간 cron
```

## 빠른 시작

```bash
npm install
npm run dev
```

→ http://localhost:3000 (가짜/샘플 데이터 없음 — Supabase 연결·크롤러 수집 전에는
**비어 있는 상태**로 뜹니다. 아래 "실데이터 연결" 참고)

## 실데이터 연결

1. **Supabase** 프로젝트 생성 → SQL Editor에 `db/schema.sql` 실행
2. `.env.example`을 복사해 `.env.local`(프론트) 채우기
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 크롤러 실행 (로컬 테스트):
   ```bash
   cd crawler
   pip install -r requirements.txt
   python run.py           # 키 있는 소스만 실수집, 없으면 건너뜀
   ```
4. **GitHub Actions Secrets**에 `SUPABASE_*`, `COUPANG_*`, `ALIEXPRESS_*` 등록
   → 3시간마다 자동 수집

## 배포 (Vercel)

- GitHub 저장소 연결 → Vercel이 push마다 자동 빌드
- Vercel 프로젝트 환경변수에 `NEXT_PUBLIC_SUPABASE_*` 등록
- 홈/상세는 ISR(10분 재검증)로 정적 생성 → 빠르고 SEO 유리

## 핵심 로직 요약

- **특가만 수집**: 전 상품 추적 X. 쿠팡 골드박스·알리 프로모션 등 "이미 할인된"
  피드를 소비. 노출된 상품만 `price_history`에 쌓아 그래프·평균 계산.
- **하락률 2단**: Day1엔 정가 대비 → 이력 쌓이면 **평균 대비**로 자동 승격 +
  🏆역대최저가 뱃지.
- **가격오류 가드레일**: 20~70% 정상 특가 / 70~90% ⚠️오류의심 뱃지 /
  90%↑·1,000원 미만 자동 보류(수집버그 컷).
- **딜 종료**: 매 수집마다 진행중 딜 재검사 → 가격 원복/피드 이탈 시 `ended`.

## 실호출 상태 (키 발급 후 확인할 것)

가짜/샘플 데이터는 전부 제거됨. 키가 있는 소스만 실제 API를 호출하고, 없으면
건너뜁니다(빈 목록).

- `coupang.py` · `aliexpress.py` · `flights.py`: **실 API 호출 코드 완성**.
  키 발급 후 **실제 응답 필드명 매핑을 1회만 검증**하세요(문서/응답 기준).
- `cps.py` · `auction.py`: 요청 골격은 있으나 **특가 목록 피드/응답 매핑은
  TODO** — 링크프라이스 머천트 피드 / 공공데이터 응답 구조에 맞춰 채우세요.

> ⚠️ 공식 어필리에이트 API만 사용합니다. 커뮤니티·공개 페이지 스크래핑은
> ToS·저작권 문제로 사용하지 않습니다.

## 국내몰 (링크프라이스 CPS 제휴)

쿠팡·알리 외 **G마켓·11번가·위메프·옥션·SSG·롯데온·인터파크·오늘의집·올리브영**
등 국내몰은 **링크프라이스(LinkPrice) 한 계정**으로 제휴링크를 만들어 수익화합니다.

- [crawler/affiliate.py](crawler/affiliate.py): 어떤 국내몰 상품 URL이든
  링크프라이스 추적 URL로 변환 (도메인→merchant 매핑). **URL 템플릿이라 키만
  있으면 즉시 동작**.
- [crawler/sources/cps.py](crawler/sources/cps.py): 국내몰 특가 수집 소스
  (특가 목록은 링크프라이스 머천트 피드/각 몰 API 연결 필요).
- 프론트는 `platform='cps'` 상품을 `mall_name`(G마켓 등) 뱃지로 표시.
- 운영자 할 일: 링크프라이스 가입 → `LINKPRICE_AFFILIATE_ID` + 각 몰
  merchant 코드(`affiliate.py`의 `MERCHANTS`) 실제값 입력.

## 인기딜 필터 / 방문자 반응

- **❤️ 좋아요 / 클릭수**: 회원제 없음. 브라우저별 1회 좋아요
  (localStorage + DB 유니크키 이중 방지). [db/engagement.sql](db/engagement.sql)의
  `like_deal`/`click_deal`은 SECURITY DEFINER 함수라 anon 키로 안전하게 호출.
- **🔥 인기딜만 필터**: 좋아요 `HOT_LIKE_THRESHOLD`(기본 30) 이상만 노출.
  홈 상단 토글. (별도 정렬은 없음)
- 마감된 딜은 기본적으로 숨김(진행중 `active`만 노출).

## 후보 발굴 = 특가 피드 + 베스트셀러 랭킹

전 상품(수억 개) 추적은 개인이 불가하므로, "후보"를 넓게 모아 전수추적한다.
- 쿠팡: 골드박스(특가) + **베스트카테고리 랭킹**(카테고리별 상위 N개)
  → `config.COUPANG_BEST_CATEGORIES`, `COUPANG_BEST_LIMIT`로 범위 조절
- 알리: hotproduct 여러 페이지(`ALIEXPRESS_PAGES`)
- **네이버**: 쇼핑 검색 API로 키워드/카테고리별 인기상품(`NAVER_KEYWORDS`).
  수익은 판매몰이 CPS 지원 시 링크프라이스 변환, 아니면 네이버 링크.
- 이렇게 모은 수천~수만 후보의 가격을 추적하다가, **평소보다 싸진 것만** 노출.
  → "특가 피드에만 뜬 것"이 아니라 베스트셀러가 갑자기 싸진 것도 잡힘.
- ⚠️ 후보를 넓힐수록 API 콜·이력 저장량↑ → 쿼터/용량 한도 내에서 조절.

## 할인 판정 = 신뢰 우선(가격 이력 기반)

- **확정 기준은 오직 "평소 실제 판매가(이력 중앙값) 대비 하락률"**. 정가(list_price)
  대비는 뻥튀기 정가에 속으므로 판정에 쓰지 않고 표시용으로만.
- 상시 할인(늘 그 가격)은 평균≈현재가 → 하락률 0% → **자동 탈락**.
- 이력이 부족하면(`MIN_HISTORY_POINTS`/`MIN_HISTORY_DAYS` 미만) 확정하지 않고
  **"관찰중"**으로 두고 가격만 계속 수집 → 충분해지면 검증 후 노출.
- 특가 피드(골드박스·프로모션)는 "확정 기준"이 아니라 **감시 후보 발굴용**.
- 로직: [crawler/detect.py](crawler/detect.py) `classify()`.

## 항공권 특가 (실 요금 API)

쇼핑과 구조가 달라(노선·날짜·항공사) **별도 테이블**([db/flights.sql](db/flights.sql)).
- **Travelpayouts(아비아세일즈) 실 요금 API**로 출발지별 최저가 수집
  ([crawler/sources/flights.py](crawler/sources/flights.py)). 네이버 항공권 직접
  크롤링은 봇차단·ToS로 비추 → 정식 API 사용. 예약 링크에 marker 붙여 수익화.
- 항공권 탭에서 **국내선/국제선** 서브필터(도착지 공항이 한국이면 국내선).
- 운영자: `TRAVELPAYOUTS_TOKEN`·`TRAVELPAYOUTS_MARKER` 발급(무료).

## 경매 특가 (부동산/자동차)

법원경매 공공데이터. 제휴 링크 없음 → **광고/구독**으로 수익화.
- [db/auction.sql](db/auction.sql), [crawler/sources/auction.py](crawler/sources/auction.py),
  [components/AuctionView.tsx](components/AuctionView.tsx). `?category=auction`.
- **부동산/자동차** 서브필터, **감정가 대비 최저입찰가 하락률**·유찰 횟수 표시.
- 운영자: 공공데이터포털(data.go.kr) `DATA_GO_KR_KEY` 발급(무료) + 실 응답 매핑.

## 딜 종료 처리

- 진행중 딜이 가격 원복/피드 이탈 시 `ended` 처리.
- 종료 후 **24시간은 "⏱️ 종료된 딜"로 흐리게 노출**(맨 뒤, 구매 버튼 비활성).
- 24시간 지나면 `prune_ended_deals()`로 자동 제거. 헤더 개수는 진행중만 카운트.

## 추가 기능

- **배송비/무료배송 뱃지**: `products.shipping_fee`(0=무료, null=정보없음) →
  카드·상세에 표시.
- **이미지 깨짐 폴백**: [components/SafeImage.tsx](components/SafeImage.tsx) —
  외부 이미지 로드 실패 시 자리표시로 대체.
- **검색**: 상단 검색창(`?q=`)으로 상품명 검색.
- **보기 전환**: ⊞갤러리 / ☰리스트 토글([components/DealGrid.tsx](components/DealGrid.tsx)).
  리스트형은 한 화면에 더 많이. 선택은 localStorage에 기억.
- **페이지네이션**: 페이지당 24개(`PAGE_SIZE`), `?page=`.
- **SEO 구조화 데이터**: 상세페이지에 Product JSON-LD → 구글 리치 결과
  (별점·가격 노출) 대비.

## 수집 주기

- **10분**마다(`.github/workflows/crawl.yml`, `*/10 * * * *`) +
  `concurrency`로 중복 실행 방지.
- ⚠️ 각 파트너스 API 일일 호출 쿼터를 넘지 않는지 확인하세요. 넘치면
  `*/30 * * * *`(30분) 등으로 늘리세요.

## 데이터 소스 = 공식 제휴 API만 (커뮤니티 스크래핑 없음)

법적 리스크를 피하기 위해 커뮤니티 게시판 스크래핑은 사용하지 않습니다. 딜은
모두 **각 판매사/제휴사가 공식 제공하는 API**에서만 가져오며, 클릭은 실제 판매
페이지(제휴링크)로 연결됩니다.

- 쿠팡파트너스 · 알리 어필리에이트 · 링크프라이스(CPS: G마켓·11번가 등) ·
  Travelpayouts(항공권) · 공공데이터포털(경매)

## 보안 (공개 사이트)

이 사이트엔 **회원·로그인·개인정보가 없어** 공격면이 작습니다. 그래도 공개
사이트로서 아래를 적용했습니다.

- **RLS(행수준보안)**: `db/security.sql` 실행 필수. anon 키는 브라우저에
  노출되므로, RLS로 **읽기만 허용하고 쓰기는 전부 차단**. 크롤러는 service_role
  키로 RLS를 우회해 정상 수집.
- **service_role 키 분리**: 절대 프론트(`NEXT_PUBLIC_*`)에 넣지 말 것.
  크롤러(GitHub Secrets)에서만 사용.
- **보안 헤더**: `next.config.mjs`에 X-Frame-Options(DENY), nosniff,
  Referrer-Policy, Permissions-Policy, HSTS 적용. X-Powered-By 제거.
- **링크 주입 방어**: 크롤링해온 URL은 `safeUrl()`로 http(s)만 허용
  (`javascript:`·`data:` 스킴 차단).
- **파라미터 검증**: 카테고리/정렬 URL 파라미터를 화이트리스트로 검증.

## 내가(운영자) 직접 해야 하는 일 — 체크리스트

코드로 자동화 안 되는, 계정·키·배포 작업입니다.

1. [ ] **쿠팡파트너스** 가입 → 승인 → Access/Secret 키 발급
2. [ ] **알리 어필리에이트** 가입 → App Key/Secret + Tracking ID 발급
3. [ ] **Supabase** 프로젝트 생성 → SQL Editor에서 `db/schema.sql` →
       `db/security.sql` → `db/engagement.sql` → `db/flights.sql` →
       `db/auction.sql` 순서로 실행
2-1. [ ] **링크프라이스** 가입 → `LINKPRICE_AFFILIATE_ID` + 몰별 merchant 코드
       (`crawler/affiliate.py`) 입력 (G마켓·11번가 등 국내몰 수익화)
4. [ ] Supabase > Settings > API 에서 URL / anon / service_role 키 복사
5. [ ] 로컬: `.env.example` → `.env.local` 복사 후 `NEXT_PUBLIC_*` 채우기
6. [ ] **Vercel** 에 GitHub 저장소 연결 → 환경변수 `NEXT_PUBLIC_SUPABASE_*`,
       `NEXT_PUBLIC_SITE_URL`(도메인) 등록 → 배포
7. [ ] **GitHub Secrets** 에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
       `COUPANG_*`, `ALIEXPRESS_*` 등록 (크롤러용)
8. [ ] `sources/*.py`의 `fetch()`를 실제 응답으로 1회 검증 (필드명 매핑)
9. [ ] (수익 발생 시) **사업자등록** + 세무 처리
10. [ ] (선택) 도메인 구매 후 Vercel 연결

> ⚠️ 키·비밀번호·카드정보는 절대 코드/깃에 커밋하지 말 것. `.env`는
> `.gitignore`에 포함돼 있습니다.

## 고지

사이트 하단에 제휴 고지 문구가 고정 노출됩니다(법적 필수).
```
이 사이트는 쿠팡파트너스, 알리익스프레스 어필리에이트 등 제휴마케팅 활동의
일환으로 이에 따른 일정액의 수수료를 제공받습니다.
```
