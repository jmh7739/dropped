import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabase) return Response.json({ status: "unavailable", reason: "database_not_configured" }, { status: 503 });
  const { data, error } = await supabase.from("price_history")
    .select("collected_at").order("collected_at", { ascending: false }).limit(1);
  if (error) return Response.json({ status: "unavailable", reason: "price_history_read_failed" }, { status: 503 });
  const latest = data?.[0]?.collected_at || null;
  const ageHours = latest ? (Date.now() - Date.parse(latest)) / 3600_000 : null;
  return Response.json({ status: ageHours !== null && ageHours <= 6 ? "ok" : "stale",
    lastPriceObservation: latest, ageHours: ageHours === null || !Number.isFinite(ageHours) ? null : Math.round(ageHours * 10) / 10 },
    { headers: { "Cache-Control": "no-store" } });
}
