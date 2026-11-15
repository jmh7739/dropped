import { supabase } from "./supabase";
import { PricePoint } from "./types";
import { getSnapshotIndex, getSnapshotProduct, toPricePoints } from "./priceSnapshot";

async function queryHistory(ids: number[], since?: string): Promise<Map<number, PricePoint[]>> {
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

export type HistoryRead = Map<number, PricePoint[]> & { snapshotOnly?: boolean };

/**
 * Read every API page so a 1,000-row response limit cannot turn an old price into the current price.
 * Products already in the static snapshot load their stored history and only ask the database
 * for rows newer than the snapshot, which keeps database egress small on every rebuild.
 * If that small follow-up read fails, the snapshot history is returned and `snapshotOnly` is set.
 */
export async function readPriceHistory(ids: number[], since?: string): Promise<HistoryRead> {
  const result: HistoryRead = new Map();
  if (!ids.length) return result;
  const index = await getSnapshotIndex();
  const snapAt = index?.generatedAt ? Date.parse(index.generatedAt) : NaN;
  const sinceMs = since ? Date.parse(since) : -Infinity;
  let remaining = ids;
  if (index && Number.isFinite(snapAt) && ids.length <= 1500) {
    const stored = (await Promise.all(ids.filter((id) => String(id) in index.products).map(getSnapshotProduct)))
      .filter((p): p is NonNullable<typeof p> => !!p);
    for (const p of stored) result.set(p.id, toPricePoints(p.history).filter((pt) => Date.parse(pt.collectedAt) >= sinceMs));
    const storedIds = new Set(stored.map((p) => p.id));
    remaining = ids.filter((id) => !storedIds.has(id));
    if (stored.length) {
      const from = new Date(Math.max(snapAt - 2 * 3600_000, sinceMs)).toISOString();
      try {
        const fresh = await queryHistory([...storedIds], from);
        for (const [id, points] of fresh) {
          const merged = result.get(id) ?? [];
          const seen = new Set(merged.map((pt) => `${Math.floor(Date.parse(pt.collectedAt) / 1000)}:${pt.price}`));
          for (const pt of points) if (!seen.has(`${Math.floor(Date.parse(pt.collectedAt) / 1000)}:${pt.price}`)) merged.push(pt);
          merged.sort((a, b) => Date.parse(a.collectedAt) - Date.parse(b.collectedAt));
          result.set(id, merged);
        }
      } catch (error) {
        console.error("price history increment unavailable; using snapshot", error);
        result.snapshotOnly = true;
      }
    }
  }
  if (remaining.length) for (const [id, points] of await queryHistory(remaining, since)) result.set(id, points);
  return result;
}
