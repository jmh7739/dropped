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
  return companyOnly || /(에어컨|냉난방기|전자레인지|전자렌지|정수기|공기청정기|세탁기|냉장고|음식물처리기|비데|안마의자)$/.test(keyword) || /a4용지|복사용지|빨래건조대|의류건조대/.test(keyword) || keyword === "건조대" || keyword === "가습기" || keyword === "수건";
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

export async function getRealtimeTrends(): Promise<RealtimeTrend[]> {
  if (!supabase) return [];
  const { data: latest } = await supabase.from("realtime_trends").select("collected_at").eq("is_published", true).order("collected_at", { ascending: false }).limit(1);
  if (!latest?.length) return [];
  const { data, error } = await supabase.from("realtime_trends").select("keyword,normalized_keyword,rank,previous_rank,rank_change,status,hot_score,category,affiliate_search_url,collected_at").eq("collected_at", latest[0].collected_at).eq("is_published", true).order("rank").limit(20);
  if (error || !data) return [];
  return data
    .filter((row: any) => !blockedTrendKeyword(row.keyword))
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
    });
}

export async function getTrendingProducts(limit = 30): Promise<TrendingProduct[]> {
  if (!supabase) return [];
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("trending_products").select("keyword,product_score,hot_score,category,updated_at,products(id,title,image_url,list_price,platform)").eq("is_active", true).gte("updated_at", cutoff).order("hot_score", { ascending: false }).order("product_score", { ascending: false }).limit(Math.max(limit * 3, 60));
  if (error || !data) return [];
  const candidates = data.flatMap((row: any) => {
    if (blockedTrendKeyword(row.keyword)) return [];
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (blockedSeasonalProduct(product?.title) || blockedLowTrustProduct(product?.title)) return [];
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
    if ((categoryCount.get(category) ?? 0) >= 4) continue;
    if ((keywordCount.get(keyword) ?? 0) >= 1) continue;
    result.push(product);
    categoryCount.set(category, (categoryCount.get(category) ?? 0) + 1);
    keywordCount.set(keyword, 1);
    if (result.length >= Math.min(limit, 20)) break;
  }
  return result;
}
