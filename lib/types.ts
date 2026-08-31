export type Platform = "coupang" | "aliexpress" | "cps" | "naver";

/** 이 좋아요 수 이상이면 '인기딜' */
export const HOT_LIKE_THRESHOLD = 30;
export type DealType = "shopping" | "flight" | "auction";
export type DealStatus = "active" | "ended";

export interface Category {
  name: string;
  slug: string;
  dealType: DealType;
}

export interface PricePoint {
  price: number;
  collectedAt: string; // ISO 8601
}

export interface Deal {
  id: number;
  /** hot_deals.id와 별개인 products.id. 반응(좋아요/클릭)은 이 값을 사용한다. */
  productId: number;
  platform: Platform;
  mallName: string | null; // 표시용 쇼핑몰명 (G마켓 등). 없으면 platform 라벨 사용
  shippingFee: number | null; // 배송비 (0=무료, null=정보없음)
  unitPrice: string | null; // 단위가격 (예: "100g당 1,094원")
  title: string;
  imageUrl: string;
  affiliateUrl: string;
  productUrl: string;
  categorySlug: string;
  categoryName: string;
  listPrice: number; // 정가
  currentPrice: number; // 현재가
  baselinePrice: number; // 평소 기준가 (30일 평균/중앙값)
  discountVsList: number; // 정가 대비 하락률 %
  discountVsAvg: number | null; // 평균 대비 하락률 % (이력 부족 시 null)
  isLowestEver: boolean;
  isPriceError: boolean;
  status: DealStatus;
  detectedAt: string;
  endedAt: string | null;
  history: PricePoint[];
  likeCount: number;
  clickCount: number;
  isCurated: boolean; // true = MD 추천 특가(국내몰 큐레이션, 가격추적 급락딜 아님)
}

export const CATEGORIES: Category[] = [
  { name: "디지털/컴퓨터", slug: "digital", dealType: "shopping" },
  { name: "모바일/태블릿", slug: "mobile", dealType: "shopping" },
  { name: "가전", slug: "appliance", dealType: "shopping" },
  { name: "소프트웨어/게임", slug: "software", dealType: "shopping" },
  { name: "생활/주방", slug: "living", dealType: "shopping" },
  { name: "식품", slug: "food", dealType: "shopping" },
  { name: "건강/보충제", slug: "health", dealType: "shopping" },
  { name: "패션/의류", slug: "fashion", dealType: "shopping" },
  { name: "뷰티", slug: "beauty", dealType: "shopping" },
  { name: "육아/유아", slug: "baby", dealType: "shopping" },
  { name: "스포츠/레저", slug: "sports", dealType: "shopping" },
  { name: "상품권/쿠폰", slug: "voucher", dealType: "shopping" },
  { name: "도서/콘텐츠", slug: "books", dealType: "shopping" },
  { name: "여행", slug: "flight", dealType: "flight" },
  { name: "경매 특가", slug: "auction", dealType: "auction" },
];

export const PLATFORM_LABEL: Record<Platform, string> = {
  coupang: "쿠팡",
  aliexpress: "알리익스프레스",
  cps: "국내몰",
  naver: "네이버",
};

/** 뱃지에 표시할 판매처 이름: 쇼핑몰명 우선, 없으면 플랫폼 라벨 */
export function mallLabel(d: {
  mallName: string | null;
  platform: Platform;
}): string {
  return d.mallName || PLATFORM_LABEL[d.platform];
}

/** 골드박스 (쿠팡 데일리 특가) — 별도 섹션, 매일 교체 */
export interface GoldboxDeal {
  id: number;
  title: string;
  imageUrl: string;
  affiliateUrl: string;
  listPrice: number | null;
  currentPrice: number;
  discountRate: number | null;
  unitPrice: string | null;
  shippingFee: number | null;
  category: string | null;
  label: string | null;
}

/** 항공권 특가 (노선·날짜 구조, 국내선/국제선 구분) */
export interface FlightDeal {
  id: number;
  source: string;
  origin: string;
  destination: string;
  region: string | null;
  departDate: string | null;
  returnDate: string | null; // null이면 편도
  airline: string | null;
  price: number | null;
  isDomestic: boolean;
  dealUrl: string;
  postedAt: string | null;
}

/** 경매 특가 (부동산/자동차 법원경매) */
export interface AuctionDeal {
  id: number;
  caseNo: string | null;
  assetType: "부동산" | "자동차";
  title: string;
  location: string | null;
  appraisalPrice: number | null; // 감정가
  minBidPrice: number | null; // 최저입찰가
  failCount: number; // 유찰 횟수
  bidDate: string | null; // 입찰기일(종료·하위호환)
  bidStartDate: string | null; // 입찰 시작일시
  bidEndDate: string | null; // 입찰 종료(마감)일시
  detailUrl: string;
  collectedAt: string | null; // 우리 사이트 등록일시
}
