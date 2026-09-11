const { normalizeKeyword } = require("./text");

const HARD_EXCLUDE = new Set(["상품", "제품", "추천", "할인", "세일"]);
const LOW_SIGNAL_PATTERNS = [
  /(에어컨|냉난방기|전자레인지|전자렌지|정수기|공기청정기|세탁기|냉장고|음식물처리기|비데|안마의자)$/,
  /a4용지|복사용지/i,
  /빨래건조대|의류건조대|^건조대$/,
  /^가습기$|^수건$/,
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

function isServiceKeyword(keyword) {
  const value = normalizeKeyword(keyword);
  return SERVICE_PATTERNS.some(pattern => pattern.test(value));
}

function isHardExcluded(keyword) {
  const value = normalizeKeyword(keyword);
  return !value || value.length < 2 || /^\d+$/.test(value) || HARD_EXCLUDE.has(value) || LOW_SIGNAL_PATTERNS.some(pattern => pattern.test(value)) || isServiceKeyword(value);
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

module.exports = {
  isServiceKeyword,
  isHardExcluded,
  genericPenalty,
  hasBrandSignal,
  GENERIC_TERMS,
};
