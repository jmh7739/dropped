const { normalizeKeyword } = require("./text");

const HARD_EXCLUDE = new Set(["상품", "제품", "추천", "할인", "세일"]);
const LOW_SIGNAL_PATTERNS = [
  /(에어컨|냉난방기|전자레인지|전자렌지|정수기|공기청정기|세탁기|냉장고|음식물처리기|비데|안마의자)$/,
  /a4용지|복사용지/i,
  /빨래건조대|의류건조대|^건조대$/,
  /^가습기$|^수건$/,
];
// 브랜드명이 들어 있어도 상품이 아니라 회사 자체를 뜻하는 검색어는 제외한다.
// 예: "삼성전기"를 "삼성" 브랜드 상품으로 오인하면 쇼핑 급상승 목록의 신뢰도가 떨어진다.
const COMPANY_ONLY_PATTERNS = [
  /^(?:삼성전기|삼성전자|lg전자|엘지전자|sk하이닉스|현대자동차|현대차|기아|포스코홀딩스|현대모비스|한화오션|두산에너빌리티)$/,
  /(?:그룹|홀딩스|증권|건설|중공업|바이오로직스|모비스|전기|전자)$/,
];
const COMPANY_NEWS_PATTERN = /(?:주가|실적|공시|배당|채용|회장|대표|노조|파업)$/;
// 검색량은 높아도 구매할 상품을 가리키지 않는 자연·관람 이슈는 제외한다.
// 꽃다발·화분처럼 명시적인 상품어는 막지 않고, 식물명 단독이나 축제/개화 정보만 거른다.
const NON_COMMERCE_TREND_PATTERNS = [
  /^(?:상사화|꽃무릇|벚꽃|진달래|개나리|유채꽃|코스모스|억새|단풍)$/,
  /(?:꽃축제|벚꽃축제|불꽃축제|축제일정|개화시기|개화상황|단풍시기|명소|날씨|차례상|제사상|명절음식|연휴)$/,
  /(?:경기결과|경기일정|중계|스코어|순위|출연진|재방송|몇부작|프로필|근황|사건|사고|논란)$/,
  /(?:아시안게임|올림픽|월드컵|대통령|국회의원|금리|환율|코스피|코스닥)$/,
];
const SERVICE_PATTERNS = [
  /여행|투어|크루즈|배편|항공권|렌터카|렌트카|렌트|대여|숙박|호텔|리조트|펜션|예약/,
  /공연|연극|뮤지컬|콘서트|전시|관람권|입장권|체험권|이용권/,
  /식전영상|웨딩영상|촬영대행|출장|설치서비스|수리|보험|상담|강의|레슨/,
  /상품권|기프트카드|기프티콘|이심|esim|유심개통|구독권/,
];
const GENERIC_TERMS = new Set([
  "사다리", "행거", "식탁의자", "의자", "선반", "수납장", "책상", "침대", "소파", "쇼파",
  "원피스", "티셔츠", "셔츠", "바지", "치마", "자켓", "재킷", "코트", "점퍼", "가디건",
  "신발", "운동화", "구두", "슬리퍼", "샌들", "가방", "화장품", "샴푸",
  "컴퓨터", "노트북", "모니터", "쌀", "고기", "과일", "채소", "캠핑", "등산", "낚시", "골프",
  "정수기", "공기청정기", "냉난방기", "세탁기", "냉장고", "음식물처리기", "비데", "안마의자",
  "서랍장", "화장대", "파티션", "침대프레임", "앞치마", "텀블러", "물티슈", "헤어에센스",
  "바디워시", "마스크팩", "핸드크림", "후드집업", "바람막이", "블라우스", "백팩", "안전화",
]);
const BROAD_CATEGORIES = new Set([
  "가구", "인테리어", "생활용품", "주방용품", "스포츠용품", "전자제품", "식품", "의류", "패션", "뷰티",
]);
const BRANDS = [
  "삼성", "갤럭시", "애플", "아이폰", "아이패드", "엘지", "lg", "다이슨", "닌텐도", "플레이스테이션",
  "소니", "캐논", "나이키", "아디다스", "뉴발란스", "호카", "살로몬", "헤라", "설화수", "에스티로더",
  "스팸", "정관장", "레고", "포켓몬", "샤오미", "로보락", "발뮤다", "쿠쿠", "브라운", "필립스",
];
const SHOPPING_INTENT = /선물세트|화장품|스킨|로션|에센스|크림|아이크림|쿠션|파운데이션|립스틱|샴푸|운동화|등산화|구두|슬리퍼|샌들|바람막이|패딩|가디건|원피스|재킷|자켓|가방|백팩|스마트폰|태블릿|노트북|모니터|게임기|콘솔|이어폰|헤드폰|카메라|청소기|안마기|캠핑용품|골프채|낚싯대|유모차|카시트|기저귀|분유|갈비|한우|꽃게|대하|굴비|과일세트|홍삼|영양제|유산균|비타민/;

function isServiceKeyword(keyword) {
  const value = normalizeKeyword(keyword);
  return SERVICE_PATTERNS.some(pattern => pattern.test(value));
}

function isHardExcluded(keyword) {
  const value = normalizeKeyword(keyword);
  return !value || value.length < 2 || /^\d+$/.test(value) || HARD_EXCLUDE.has(value) || LOW_SIGNAL_PATTERNS.some(pattern => pattern.test(value)) || COMPANY_ONLY_PATTERNS.some(pattern => pattern.test(value)) || COMPANY_NEWS_PATTERN.test(value) || NON_COMMERCE_TREND_PATTERNS.some(pattern => pattern.test(value)) || isServiceKeyword(value);
}

function genericPenalty(keyword) {
  const value = normalizeKeyword(keyword);
  if (GENERIC_TERMS.has(value)) return 30;
  if (/^(쌀|생수|물티슈)\d+(kg|g|l|ml)?$/i.test(value)) return 30;
  if (BROAD_CATEGORIES.has(value)) return 18;
  return 0;
}

function hasBrandSignal(keyword) {
  const value = normalizeKeyword(keyword);
  return BRANDS.some(brand => value.includes(normalizeKeyword(brand)));
}

function hasMatchingBrand(keyword, title) {
  const keywordValue = normalizeKeyword(keyword);
  const titleValue = normalizeKeyword(title);
  return BRANDS.some(brand => {
    const normalizedBrand = normalizeKeyword(brand);
    return keywordValue.includes(normalizedBrand) && titleValue.includes(normalizedBrand);
  });
}

function isLikelyShoppingKeyword(keyword) {
  const value = normalizeKeyword(keyword);
  const matchingBrand = BRANDS.find(brand => value.includes(normalizeKeyword(brand)));
  const qualifiedBrand = matchingBrand && value.length >= normalizeKeyword(matchingBrand).length + 2;
  return !isHardExcluded(value) && (Boolean(qualifiedBrand) || SHOPPING_INTENT.test(value));
}

module.exports = {
  isServiceKeyword,
  isHardExcluded,
  genericPenalty,
  hasBrandSignal,
  hasMatchingBrand,
  isLikelyShoppingKeyword,
  GENERIC_TERMS,
};
