import { supabase } from "./supabase";
import { AuctionDeal } from "./types";

export type AuctionScope = "all" | "부동산" | "자동차";
export type AuctionSort =
  | "discount_desc" // 할인률 높은순 (기본)
  | "discount_asc" // 할인률 낮은순
  | "price_desc" // 최저가 높은순
  | "price_asc" // 최저가 낮은순
  | "recent" // 최신순
  | "oldest"; // 오래된순

export const AUCTION_SORTS: { key: AuctionSort; label: string }[] = [
  { key: "discount_desc", label: "할인률 높은순" },
  { key: "discount_asc", label: "할인률 낮은순" },
  { key: "price_desc", label: "가격 높은순" },
  { key: "price_asc", label: "가격 낮은순" },
  { key: "recent", label: "최신순" },
  { key: "oldest", label: "오래된순" },
];

function dropRate(a: AuctionDeal): number {
  if (!a.appraisalPrice || !a.minBidPrice) return -1;
  return 1 - a.minBidPrice / a.appraisalPrice;
}

function sortItems(items: AuctionDeal[], sort: AuctionSort): AuctionDeal[] {
  const arr = [...items];
  switch (sort) {
    case "discount_asc":
      return arr.sort((a, b) => dropRate(a) - dropRate(b));
    case "price_desc":
      return arr.sort((a, b) => (b.minBidPrice ?? 0) - (a.minBidPrice ?? 0));
    case "price_asc":
      return arr.sort((a, b) => (a.minBidPrice ?? 1e18) - (b.minBidPrice ?? 1e18));
    case "recent":
      return arr.sort((a, b) => b.id - a.id);
    case "oldest":
      return arr.sort((a, b) => a.id - b.id);
    case "discount_desc":
    default:
      return arr.sort((a, b) => dropRate(b) - dropRate(a));
  }
}

export async function getAuctionDeals(
  scope: AuctionScope = "all",
  sort: AuctionSort = "discount_desc"
): Promise<AuctionDeal[]> {
  // Supabase 미연결 시 빈 목록 (가짜 데이터 없음)
  if (!supabase) return [];

  let query = supabase.from("auction_deals").select("*");
  if (scope !== "all") query = query.eq("asset_type", scope);

  const { data, error } = await query;
  if (error || !data) return [];
  const items: AuctionDeal[] = data.map((r: any) => ({
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
  return sortItems(items, sort);
}
