import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabase) return Response.json({ status: "unavailable", reason: "database_not_configured" }, { status: 503 });
  const { data, error } = await supabase.from("price_history")
    .select("collected_at").order("collected_at", { ascending: false }).limit(1);
  if (error) return Response.json({ status: "unavailable", reason: "price_history_read_failed" }, { status: 503 });
  const latest = data?.[0]?.collected_at || null;
  const ageHours = latest ? (Date.now() - Date.parse(latest)) / 3600_000 : null;
  const adminUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let coupangLastPriceObservation: string | null = null;
  if (adminUrl && adminKey) {
    try {
      const admin = createClient(adminUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: coupang } = await admin.from("price_history")
        .select("collected_at,products!inner(platform)")
        .eq("products.platform", "coupang")
        .order("collected_at", { ascending: false }).limit(1);
      coupangLastPriceObservation = coupang?.[0]?.collected_at || null;
    } catch { /* Other price sources still report their health. */ }
  }
  return Response.json({ status: ageHours !== null && ageHours <= 6 ? "ok" : "stale",
    lastPriceObservation: latest, coupangLastPriceObservation,
    ageHours: ageHours === null || !Number.isFinite(ageHours) ? null : Math.round(ageHours * 10) / 10 },
    { headers: { "Cache-Control": "no-store" } });
}
