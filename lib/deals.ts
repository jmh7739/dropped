import { supabase } from "./supabase";
import { Deal, PricePoint, HOT_LIKE_THRESHOLD } from "./types";

export type SortKey =
  | "discount" // 할인률 높은순 (기본)
  | "popular" // 인기순 (클릭·좋아요)
  | "discount_asc" // 할인률 낮은순
  | "price_asc" // 가격 낮은순
  | "price_desc" // 가격 높은순
  | "recent"; // 최신순

export const DEAL_SORTS: { key: SortKey; label: string }[] = [
  { key: "discount", label: "할인률 높은순" },
  { key: "popular", label: "인기순" },
  { key: "discount_asc", label: "할인률 낮은순" },
  { key: "price_asc", label: "가격 낮은순" },
  { key: "price_desc", label: "가격 높은순" },
  { key: "recent", label: "최신순" },
];

/** DB 행 → Deal 매핑 */
function rowToDeal(row: any, history: PricePoint[]): Deal {
  return {
    id: row.deal_id,
    platform: row.platform,
    mallName: row.mall_name ?? null,
    shippingFee: row.shipping_fee ?? null,
    unitPrice: row.unit_price ?? null,
    title: row.title,
    imageUrl: row.image_url ?? "",
    affiliateUrl: row.affiliate_url ?? row.product_url ?? "#",
    productUrl: row.product_url ?? "#",
    categorySlug: row.category_slug ?? "",
    categoryName: row.category_name ?? "기타",
    listPrice: row.list_price ?? 0,
    currentPrice: row.current_price,
    baselinePrice: row.baseline_price ?? 0,
    discountVsList: Number(row.discount_vs_list ?? 0),
    discountVsAvg:
      row.discount_vs_avg !== null ? Number(row.discount_vs_avg) : null,
    isLowestEver: Boolean(row.is_lowest_ever),
    isPriceError: Boolean(row.is_price_error),
    status: row.status,
    detectedAt: row.detected_at,
    endedAt: row.ended_at,
    history,
    likeCount: Number(row.like_count ?? 0),
    clickCount: Number(row.click_count ?? 0),
  };
}

function sortDeals(deals: Deal[], sort: SortKey): Deal[] {
  // 종료된 딜은 항상 맨 뒤로
  const active = deals.filter((d) => d.status !== "ended");
  const ended = deals.filter((d) => d.status === "ended");
  return [...sortActive(active, sort), ...sortActive(ended, sort)];
}

function headlineRate(d: Deal): number {
  return d.discountVsAvg ?? d.discountVsList;
}

// 인기 점수 = 하락률 + 클릭·좋아요 (page.tsx 상단 TOP과 동일 기준)
function popScore(d: Deal): number {
  return headlineRate(d) + d.clickCount * 2 + d.likeCount * 5;
}

function sortActive(deals: Deal[], sort: SortKey): Deal[] {
  const arr = [...deals];
  switch (sort) {
    case "popular":
      return arr.sort((a, b) => popScore(b) - popScore(a));
    case "recent":
      return arr.sort(
        (a, b) =>
          new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
      );
    case "discount_asc":
      return arr.sort((a, b) => headlineRate(a) - headlineRate(b));
    case "price_asc":
      return arr.sort((a, b) => a.currentPrice - b.currentPrice);
    case "price_desc":
      return arr.sort((a, b) => b.currentPrice - a.currentPrice);
    case "discount":
    default:
      return arr.sort((a, b) => headlineRate(b) - headlineRate(a));
  }
}

export interface GetDealsOpts {
  category?: string; // slug
  sort?: SortKey;
  hotOnly?: boolean; // 인기딜(좋아요 임계값 이상)만
  q?: string; // 상품명 검색어
}

/** 홈/카테고리 리스트용 딜 목록 (그래프 이력은 상세에서만 로드) */
export async function getDeals(opts: GetDealsOpts = {}): Promise<Deal[]> {
  const { category, sort = "discount", hotOnly = false, q } = opts;
  const term = q?.trim().toLowerCase();

  // Supabase 미연결 시 빈 목록 (가짜 데이터 없음)
  if (!supabase) return [];

  let query = supabase.from("v_active_deals").select("*");
  if (category) query = query.eq("category_slug", category);
  if (hotOnly) query = query.gte("like_count", HOT_LIKE_THRESHOLD);
  if (term) query = query.ilike("title", `%${term}%`);
  const { data, error } = await query;
  if (error || !data) {
    console.error("getDeals error:", error?.message);
    return [];
  }
  const deals = data.map((row) => rowToDeal(row, []));
  return sortDeals(deals, sort);
}

/** 상세 페이지용: 딜 1건 + 가격 이력 */
export async function getDeal(id: number): Promise<Deal | null> {
  if (!supabase) return null;

  const { data: row, error } = await supabase
    .from("v_active_deals")
    .select("*")
    .eq("deal_id", id)
    .single();
  if (error || !row) return null;

  const { data: hist } = await supabase
    .from("price_history")
    .select("price, collected_at")
    .eq("product_id", row.product_id)
    .order("collected_at", { ascending: true });

  const history: PricePoint[] = (hist ?? []).map((h: any) => ({
    price: h.price,
    collectedAt: h.collected_at,
  }));
  return rowToDeal(row, history);
}
