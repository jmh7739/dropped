import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { readPriceHistory } from "@/lib/priceHistory";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map(Number).filter(n =>
    Number.isSafeInteger(n) && n > 0 && n <= 2147483647))].slice(0, 12);
  if (!ids.length || raw.length > 150) return NextResponse.json({ items: [] });
  if (!supabase) return NextResponse.json({ items: [] });
  try {
    const { data, error } = await supabase.from("products")
      .select("id,title,mall_name").in("id", ids).limit(12);
    if (error) throw error;
    const history = await readPriceHistory(ids, new Date(Date.now() - 90 * 86400000).toISOString());
    const items = (data ?? []).map(product => {
      const points = history.get(product.id) ?? [];
      const last = points.at(-1);
      return {
        id: product.id, title: product.title, mall: product.mall_name,
        price: last?.price ?? null, lowest: points.length ? Math.min(...points.map(p => p.price)) : null,
        checkedAt: last?.collectedAt ?? null,
      };
    });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch {
    return NextResponse.json({ items: [], unavailable: true }, { status: 503 });
  }
}
