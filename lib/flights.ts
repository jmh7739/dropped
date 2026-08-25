import { supabase } from "./supabase";
import { FlightDeal } from "./types";

export type FlightScope = "all" | "domestic" | "intl";

export async function getFlightDeals(
  scope: FlightScope = "all"
): Promise<FlightDeal[]> {
  // Supabase 미연결 시 빈 목록 (가짜 데이터 없음)
  if (!supabase) return [];

  let query = supabase
    .from("flight_deals")
    .select("*")
    .order("posted_at", { ascending: false });
  if (scope === "domestic") query = query.eq("is_domestic", true);
  if (scope === "intl") query = query.eq("is_domestic", false);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    source: r.source,
    origin: r.origin,
    destination: r.destination,
    departDate: r.depart_date,
    returnDate: r.return_date,
    airline: r.airline,
    price: r.price,
    isDomestic: r.is_domestic,
    dealUrl: r.deal_url,
    postedAt: r.posted_at,
  }));
}
