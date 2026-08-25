import { supabase } from "./supabase";
import { AuctionDeal } from "./types";

export type AuctionScope = "all" | "부동산" | "자동차";

export async function getAuctionDeals(
  scope: AuctionScope = "all"
): Promise<AuctionDeal[]> {
  // Supabase 미연결 시 빈 목록 (가짜 데이터 없음)
  if (!supabase) return [];

  let query = supabase
    .from("auction_deals")
    .select("*")
    .order("bid_date", { ascending: true });
  if (scope !== "all") query = query.eq("asset_type", scope);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    caseNo: r.case_no,
    assetType: r.asset_type,
    title: r.title,
    location: r.location,
    appraisalPrice: r.appraisal_price,
    minBidPrice: r.min_bid_price,
    failCount: r.fail_count ?? 0,
    bidDate: r.bid_date,
    detailUrl: r.detail_url,
  }));
}
