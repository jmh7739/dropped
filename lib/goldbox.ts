import { supabase } from "./supabase";
import { GoldboxDeal } from "./types";

export async function getGoldboxDeals(): Promise<GoldboxDeal[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("goldbox_deals")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    title: r.title,
    imageUrl: r.image_url ?? "",
    affiliateUrl: r.affiliate_url,
    listPrice: r.list_price ?? null,
    currentPrice: r.current_price,
    discountRate: r.discount_rate ?? null,
    unitPrice: r.unit_price ?? null,
    shippingFee: r.shipping_fee ?? null,
  }));
}
