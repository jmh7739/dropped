import { supabase } from "./supabase";

export interface RealtimeTrend {
  keyword: string;
  normalizedKeyword: string;
  rank: number;
  previousRank: number | null;
  rankChange: number | null;
  status: "up" | "down" | "same" | "NEW";
  hotScore: number;
  category: string;
  affiliateUrl: string | null;
  collectedAt: string;
}

export interface TrendingProduct {
  id: number;
  keyword: string;
  title: string;
  imageUrl: string;
  price: number | null;
  productScore: number;
  hotScore: number;
  category: string;
  updatedAt: string;
  platform: string;
}

function usableProductImage(value: unknown): string {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) && !/favicon(?:\.ico)?|(?:^|[\/_-])logo(?:[\/_-]|\.)|placeholder|blank|spacer|1x1|f30_30/i.test(url) ? url : "";
}

function blockedTrendKeyword(value: unknown): boolean {
  const keyword = String(value || "").toLowerCase().replace(/[^0-9a-z가-힣]/gi, "");
  const companyOnly = /^(?:삼성전기|삼성전자|lg전자|엘지전자|sk하이닉스|현대자동차|현대차|기아|포스코홀딩스|현대모비스|한화오션|두산에너빌리티)$/.test(keyword)
    || /(?:그룹|홀딩스|증권|건설|중공업|바이오로직스|모비스|전기|전자)$/.test(keyword)
    || /(?:주가|실적|공시|배당|채용|회장|대표|노조|파업)$/.test(keyword);
  const nonCommerceTrend = /^(?:상사화|꽃무릇|벚꽃|진달래|개나리|유채꽃|코스모스|억새|단풍)$/.test(keyword)
    || /(?:꽃축제|벚꽃축제|불꽃축제|축제일정|개화시기|개화상황|단풍시기|명소|날씨|차례상|제사상|명절음식|연휴)$/.test(keyword)
    || /(?:경기결과|경기일정|중계|스코어|순위|출연진|재방송|몇부작|프로필|근황|사건|사고|논란)$/.test(keyword)
    || /(?:아시안게임|올림픽|월드컵|대통령|국회의원|금리|환율|코스피|코스닥)$/.test(keyword);
  return companyOnly || nonCommerceTrend || /(에어컨|냉난방기|전자레인지|전자렌지|정수기|공기청정기|세탁기|냉장고|음식물처리기|비데|안마의자)$/.test(keyword) || /a4용지|복사용지|빨래건조대|의류건조대/.test(keyword) || keyword === "건조대" || keyword === "가습기" || keyword === "수건";
}

function blockedSeasonalProduct(value: unknown): boolean {
  const title = String(value || "").toLowerCase().replace(/\s+/g, "");
  const currentYear = new Date().getFullYear();
  const staleYear = /(?:20)?(\d{2})년/.exec(title);
  if (staleYear) {
    const yy = Number(staleYear[1]);
    const year = yy < 100 ? 2000 + yy : yy;
    if (year < currentYear) return true;
  }
  return /설선물|설날선물|구정선물/.test(title);
}

function blockedLowTrustProduct(value: unknown): boolean {
  const title = String(value || "").toLowerCase().replace(/\s+/g, " ");
  return /마른\s*유바|인형용.*(?:모헤어|머리카락)|모헤어.*인형|랜덤\s*(?:박스|상품)|복불복|미스터리\s*박스/.test(title);
}

const TREND_BRANDS = [
  "삼성", "갤럭시", "애플", "아이폰", "아이패드", "엘지", "lg", "다이슨",
  "닌텐도", "플레이스테이션", "소니", "캐논", "나이키", "아디다스", "뉴발란스",
  "호카", "살로몬", "헤라", "설화수", "에스티로더", "스팸", "정관장", "레고",
  "포켓몬", "샤오미", "로보락", "발뮤다", "쿠쿠", "브라운", "필립스",
];

const PRODUCT_INTENT = /선물세트|화장품|스킨|로션|에센스|크림|아이크림|쿠션|파운데이션|립스틱|샴푸|운동화|등산화|구두|슬리퍼|샌들|바람막이|패딩|가디건|원피스|재킷|자켓|가방|백팩|스마트폰|태블릿|노트북|모니터|게임기|콘솔|이어폰|헤드폰|카메라|청소기|안마기|캠핑용품|골프채|낚싯대|유모차|카시트|기저귀|분유|갈비|한우|꽃게|대하|굴비|과일세트|홍삼|영양제|유산균|비타민|카드|스위치|플레이스테이션|에어팟|갤럭시|아이폰|아이패드/;

function likelyProductTrend(value: unknown): boolean {
  const keyword = String(value || "").toLowerCase().replace(/[^0-9a-z가-힣]/gi, "");
  if (!keyword || blockedTrendKeyword(keyword)) return false;
  const brand = TREND_BRANDS.find((item) => keyword.includes(item));
  return PRODUCT_INTENT.test(keyword) || Boolean(brand && keyword.length >= brand.length + 2);
}

function trendProductMatches(keywordValue: unknown, titleValue: unknown): boolean {
  const keyword = String(keywordValue || "").toLowerCase().replace(/[^0-9a-z가-힣]/gi, "");
  const title = String(titleValue || "").toLowerCase().replace(/[^0-9a-z가-힣]/gi, "");
  if (!keyword || !title) return false;
  const mentionedBrands = TREND_BRANDS.filter((brand) => keyword.includes(brand));
  return mentionedBrands.length === 0 || mentionedBrands.every((brand) => title.includes(brand));
}

export async function getRealtimeTrends(): Promise<RealtimeTrend[]> {
  if (!supabase) return [];
  const { data: latest } = await supabase.from("realtime_trends").select("collected_at").eq("is_published", true).order("collected_at", { ascending: false }).limit(1);
  if (!latest?.length) return [];
  const { data, error } = await supabase.from("realtime_trends").select("keyword,normalized_keyword,rank,previous_rank,rank_change,status,hot_score,category,affiliate_search_url,collected_at").eq("collected_at", latest[0].collected_at).eq("is_published", true).order("rank").limit(100);
  if (error || !data) return [];
  return data
    .filter((row: any) => likelyProductTrend(row.keyword))
    .map((row: any, index: number) => {
      const rank = index + 1;
      const rankShiftedByFilter = Number(row.rank) !== rank;
      return {
        keyword: row.keyword,
        normalizedKeyword: row.normalized_keyword,
        rank,
        previousRank: rankShiftedByFilter ? null : row.previous_rank,
        rankChange: rankShiftedByFilter ? 0 : row.rank_change,
        status: rankShiftedByFilter ? "same" as const : row.status,
        hotScore: Number(row.hot_score),
        category: row.category || "",
        affiliateUrl: row.affiliate_search_url || null,
        collectedAt: row.collected_at,
      };
    })
    .slice(0, 20);
}

export async function getTrendingProducts(limit = 30): Promise<TrendingProduct[]> {
  if (!supabase) return [];
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("trending_products").select("keyword,product_score,hot_score,category,updated_at,products(id,title,image_url,list_price,platform)").eq("is_active", true).gte("updated_at", cutoff).order("hot_score", { ascending: false }).order("product_score", { ascending: false }).limit(Math.max(limit * 3, 120));
  if (error || !data) return [];
  const candidates = data.flatMap((row: any) => {
    if (!likelyProductTrend(row.keyword)) return [];
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (blockedSeasonalProduct(product?.title) || blockedLowTrustProduct(product?.title) || !trendProductMatches(row.keyword, product?.title)) return [];
    const imageUrl = usableProductImage(product?.image_url);
    const price = product?.list_price != null ? Number(product.list_price) : null;
    if (!product || !imageUrl || (price !== null && price < 1000)) return [];
    return [{ id: product.id, keyword: row.keyword, title: product.title, imageUrl, price, productScore: Number(row.product_score), hotScore: Number(row.hot_score), category: row.category || "기타", updatedAt: row.updated_at, platform: product.platform || "coupang" }];
  });

  const result: TrendingProduct[] = [];
  const categoryCount = new Map<string, number>();
  const keywordCount = new Map<string, number>();
  for (const product of candidates) {
    const category = product.category || "기타";
    const keyword = product.keyword.toLowerCase().replace(/\s+/g, "");
    if ((categoryCount.get(category) ?? 0) >= 8) continue;
    if ((keywordCount.get(keyword) ?? 0) >= 2) continue;
    result.push(product);
    categoryCount.set(category, (categoryCount.get(category) ?? 0) + 1);
    keywordCount.set(keyword, (keywordCount.get(keyword) ?? 0) + 1);
    if (result.length >= Math.min(limit, 40)) break;
  }
  return result;
}
