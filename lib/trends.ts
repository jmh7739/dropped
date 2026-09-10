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
}

function usableProductImage(value: unknown): string {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) && !/favicon(?:\.ico)?|(?:^|[\/_-])logo(?:[\/_-]|\.)|placeholder|blank|spacer|1x1|f30_30/i.test(url) ? url : "";
}

export async function getRealtimeTrends(): Promise<RealtimeTrend[]> {
  if (!supabase) return [];
  const { data: latest } = await supabase.from("realtime_trends").select("collected_at").eq("is_published", true).order("collected_at", { ascending: false }).limit(1);
  if (!latest?.length) return [];
  const { data, error } = await supabase.from("realtime_trends").select("keyword,normalized_keyword,rank,previous_rank,rank_change,status,hot_score,category,affiliate_search_url").eq("collected_at", latest[0].collected_at).eq("is_published", true).order("rank").limit(20);
  if (error || !data) return [];
  return data.map((row: any) => ({
    keyword: row.keyword,
    normalizedKeyword: row.normalized_keyword,
    rank: row.rank,
    previousRank: row.previous_rank,
    rankChange: row.rank_change,
    status: row.status,
    hotScore: Number(row.hot_score),
    category: row.category || "",
    affiliateUrl: row.affiliate_search_url || null,
  }));
}

export async function getTrendingProducts(limit = 30): Promise<TrendingProduct[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("trending_products").select("keyword,product_score,hot_score,category,products(id,title,image_url,list_price)").eq("is_active", true).order("hot_score", { ascending: false }).order("product_score", { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data.flatMap((row: any) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const imageUrl = usableProductImage(product?.image_url);
    // SafeImage가 빈/깨진 이미지를 자리표시로 처리하므로 수익 링크가 준비된 상품은 유지한다.
    return product ? [{ id: product.id, keyword: row.keyword, title: product.title, imageUrl, price: product.list_price != null ? Number(product.list_price) : null, productScore: Number(row.product_score), hotScore: Number(row.hot_score), category: row.category || "" }] : [];
  });
}
