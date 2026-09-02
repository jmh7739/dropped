import { supabase } from "./supabase";
import { PricePoint } from "./types";

/**
 * SEO용 '상품 가격 페이지' 데이터 — 딜이 끝나도 유지되는 영구 리포트.
 *   products + price_history에서 직접 뽑아, 검색 유입용 canonical 페이지를 만든다.
 */
export interface ProductReport {
  id: number;
  platform: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  affiliateUrl: string;
  listPrice: number;
  mallName: string | null;
  shippingFee: number | null;
  unitPrice: string | null;
  categorySlug: string;
  categoryName: string;
  currentPrice: number;
  history: PricePoint[];
  hasActiveDeal: boolean;
}

export async function getProductReport(
  id: number
): Promise<ProductReport | null> {
  if (!supabase || !Number.isFinite(id)) return null;

  const { data: p, error } = await supabase
    .from("products")
    .select("*, categories(slug, name)")
    .eq("id", id)
    .single();
  if (error || !p) return null;

  const { data: hist } = await supabase
    .from("price_history")
    .select("price, collected_at")
    .eq("product_id", id)
    .order("collected_at", { ascending: true });

  const history: PricePoint[] = (hist ?? []).map((h: any) => ({
    price: h.price,
    collectedAt: h.collected_at,
  }));
  if (history.length === 0) return null; // 이력 없으면 리포트 의미 없음 → 404

  const { data: hd } = await supabase
    .from("hot_deals")
    .select("id")
    .eq("product_id", id)
    .eq("status", "active")
    .limit(1);

  const cat = (p as any).categories;
  return {
    id: p.id,
    platform: p.platform,
    title: p.title,
    imageUrl: p.image_url ?? "",
    productUrl: p.product_url ?? "#",
    affiliateUrl: p.affiliate_url ?? p.product_url ?? "#",
    listPrice: p.list_price ?? 0,
    mallName: p.mall_name ?? null,
    shippingFee: p.shipping_fee ?? null,
    unitPrice: p.unit_price ?? null,
    categorySlug: cat?.slug ?? "",
    categoryName: cat?.name ?? "기타",
    currentPrice: history[history.length - 1].price,
    history,
    hasActiveDeal: (hd?.length ?? 0) > 0,
  };
}
