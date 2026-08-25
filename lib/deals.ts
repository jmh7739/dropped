import { supabase } from "./supabase";
import { Deal, PricePoint, HOT_LIKE_THRESHOLD } from "./types";

export type SortKey = "discount" | "recent";

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

function sortActive(deals: Deal[], sort: SortKey): Deal[] {
  const arr = [...deals];
  if (sort === "recent") {
    arr.sort(
      (a, b) =>
        new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
  } else {
    arr.sort((a, b) => {
      const da = a.discountVsAvg ?? a.discountVsList;
      const db = b.discountVsAvg ?? b.discountVsList;
      return db - da;
    });
  }
  return arr;
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
