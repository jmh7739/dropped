import { supabase } from "./supabase";
import { PricePoint } from "./types";

/** Read every API page so a 1,000-row response limit cannot turn an old price into the current price. */
export async function readPriceHistory(ids: number[], since?: string): Promise<Map<number, PricePoint[]>> {
  const byProduct = new Map<number, PricePoint[]>();
  if (!supabase || !ids.length) return byProduct;
  const cutoff = new Date().toISOString();
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from("price_history").select("id,product_id,price,collected_at")
      .gt("price", 0).lte("collected_at", cutoff)
      .in("product_id", ids).order("collected_at", { ascending: true }).order("id", { ascending: true })
      .range(offset, offset + 999);
    if (since) query = query.gte("collected_at", since);
    const { data, error } = await query;
    if (error) throw new Error(`Price history unavailable: ${error.code}`);
    for (const row of data ?? []) {
      if (row.price <= 0 || !Number.isFinite(new Date(row.collected_at).getTime())) continue;
      const points = byProduct.get(row.product_id) ?? [];
      points.push({ price: row.price, collectedAt: row.collected_at });
      byProduct.set(row.product_id, points);
    }
    if (!data || data.length < 1000) break;
  }
  return byProduct;
}
