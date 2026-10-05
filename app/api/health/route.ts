import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MAX_OBSERVATION_AGE_HOURS = 30;

function sourceHealth(observedAt: string | null) {
  const ageHours = observedAt ? (Date.now() - Date.parse(observedAt)) / 3600_000 : null;
  return {
    lastPriceObservation: observedAt,
    ageHours: ageHours === null || !Number.isFinite(ageHours)
      ? null
      : Math.round(ageHours * 10) / 10,
  };
}

export async function GET() {
  if (!supabase) return Response.json({ status: "unavailable", reason: "database_not_configured" }, { status: 503 });
  const { data, error } = await supabase.from("price_history")
    .select("collected_at").order("collected_at", { ascending: false }).limit(1);
  if (error) return Response.json({ status: "unavailable", reason: "price_history_read_failed" }, { status: 503 });
  const latest = data?.[0]?.collected_at || null;
  const ageHours = latest ? (Date.now() - Date.parse(latest)) / 3600_000 : null;
  const adminUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sourceTimes: Record<"aliexpress" | "coupang" | "cps", string | null> = {
    aliexpress: null,
    coupang: null,
    cps: null,
  };
  let detailedHealthAvailable = false;
  if (adminUrl && adminKey) {
    try {
      const admin = createClient(adminUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const observations = await Promise.all(
        (Object.keys(sourceTimes) as Array<keyof typeof sourceTimes>).map(async (platform) => {
          const { data: rows, error: sourceError } = await admin.from("price_history")
            .select("collected_at,products!inner(platform)")
            .eq("products.platform", platform)
            .order("collected_at", { ascending: false })
            .limit(1);
          if (sourceError) throw sourceError;
          return [platform, rows?.[0]?.collected_at || null] as const;
        }),
      );
      for (const [platform, observedAt] of observations) sourceTimes[platform] = observedAt;
      detailedHealthAvailable = true;
    } catch { /* Other price sources still report their health. */ }
  }

  const sources = {
    aliexpress: sourceHealth(sourceTimes.aliexpress),
    coupang: sourceHealth(sourceTimes.coupang),
    domesticPartners: sourceHealth(sourceTimes.cps),
  };
  const overseasFresh = sources.aliexpress.ageHours !== null
    && sources.aliexpress.ageHours <= MAX_OBSERVATION_AGE_HOURS;
  const domesticFresh = [sources.coupang.ageHours, sources.domesticPartners.ageHours]
    .some((sourceAge) => sourceAge !== null && sourceAge <= MAX_OBSERVATION_AGE_HOURS);
  const overallFresh = ageHours !== null && ageHours <= MAX_OBSERVATION_AGE_HOURS;
  const status = detailedHealthAvailable
    ? (overseasFresh && domesticFresh ? "ok" : "degraded")
    : (overallFresh ? "ok" : "stale");

  return Response.json({ status,
    lastPriceObservation: latest,
    coupangLastPriceObservation: sourceTimes.coupang,
    ageHours: ageHours === null || !Number.isFinite(ageHours) ? null : Math.round(ageHours * 10) / 10,
    sources },
    { headers: { "Cache-Control": "no-store" } });
}
