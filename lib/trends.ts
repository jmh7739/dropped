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

export async function getTrendingProducts(limit = 24): Promise<TrendingProduct[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("trending_products").select("keyword,product_score,hot_score,category,products(id,title,image_url,list_price)").eq("is_active", true).order("hot_score", { ascending: false }).order("product_score", { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data.flatMap((row: any) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const imageUrl = product?.image_url || "";
    // 이미지 없는 상품은 카드가 깨져 보이므로 제외(이미지 있는 것만 노출).
    return product && imageUrl ? [{ id: product.id, keyword: row.keyword, title: product.title, imageUrl, price: product.list_price != null ? Number(product.list_price) : null, productScore: Number(row.product_score), hotScore: Number(row.hot_score), category: row.category || "" }] : [];
  });
}
