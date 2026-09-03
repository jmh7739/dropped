import { supabase } from "./supabase";
import { Deal, PricePoint, HOT_LIKE_THRESHOLD } from "./types";
import { headlineDropRate, hotDealScore } from "./dropMetrics";

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
    productId: row.product_id,
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
    checkedAt: row.checked_at ?? row.updated_at ?? null,
    history,
    likeCount: Number(row.like_count ?? 0),
    clickCount: Number(row.click_count ?? 0),
    // baseline 없음 = 가격추적 급락딜이 아닌 'MD 추천 특가'(국내몰 큐레이션)
    isCurated: row.baseline_price == null,
  };
}

function sortDeals(deals: Deal[], sort: SortKey): Deal[] {
  // 종료된 딜은 항상 맨 뒤로
  const active = deals.filter((d) => d.status !== "ended");
  const ended = deals.filter((d) => d.status === "ended");
  return [...sortActive(active, sort), ...sortActive(ended, sort)];
}

function headlineRate(d: Deal): number {
  return headlineDropRate(d);
}

function popScore(d: Deal): number {
  return hotDealScore(d);
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

// 가격 '상태' 필터 — 상품종류가 아니라 "얼마나 싼가"로 거른다(떨어졌다의 핵심).
export type PriceStatusKey = "plunge" | "lowest" | "bigdrop" | "fresh";
export const PRICE_STATUS: { key: PriceStatusKey; label: string }[] = [
  { key: "plunge", label: "🔥 지금 급락" },
  { key: "lowest", label: "🏆 최근 최저" },
  { key: "bigdrop", label: "💸 많이 하락" },
  { key: "fresh", label: "⏱ 방금 떨어짐" },
];

function matchesPriceStatus(d: Deal, ps: PriceStatusKey): boolean {
  const r = headlineRate(d);
  switch (ps) {
    case "plunge":
      return r >= 25;
    case "lowest":
      return d.isLowestEver;
    case "bigdrop":
      return r >= 15;
    case "fresh":
      return Date.now() - new Date(d.detectedAt).getTime() <= 6 * 3600 * 1000;
  }
}

export interface GetDealsOpts {
  category?: string; // slug
  sort?: SortKey;
  hotOnly?: boolean; // 인기딜(좋아요 임계값 이상)만
  q?: string; // 상품명 검색어
  priceStatus?: PriceStatusKey; // 가격 상태 필터
}

/** 홈/카테고리 리스트용 딜 목록 (그래프 이력은 상세에서만 로드) */
export async function getDeals(opts: GetDealsOpts = {}): Promise<Deal[]> {
  const { category, sort = "recent", hotOnly = false, q, priceStatus } = opts;
  const term = q?.trim().toLowerCase();

  // Supabase 미연결 시 빈 목록 (가짜 데이터 없음)
  if (!supabase) return [];

  let query = supabase
    .from("v_active_deals")
    .select("*")
    .not("baseline_price", "is", null); // 급락딜만(추천딜=baseline null은 제외)
  if (category) query = query.eq("category_slug", category);
  if (hotOnly) query = query.gte("like_count", HOT_LIKE_THRESHOLD);
  if (term) query = query.ilike("title", `%${term}%`);
  const { data, error } = await query;
  if (error || !data) {
    console.error("getDeals error:", error?.message);
    return [];
  }
  let deals = data.map((row) => rowToDeal(row, []));
  // 가격 상태 필터는 종료딜엔 의미없음 → 활성만 대상으로 거른다.
  if (priceStatus)
    deals = deals.filter(
      (d) => d.status !== "ended" && matchesPriceStatus(d, priceStatus)
    );
  return sortDeals(deals, sort);
}

/** 국내몰 추천 특가(MD 큐레이션 = baseline 없는 활성 딜). 카테고리 필터·정렬 지원. */
export async function getCuratedDeals(
  sort: SortKey = "recent",
  category?: string
): Promise<Deal[]> {
  if (!supabase) return [];
  let query = supabase
    .from("v_active_deals")
    .select("*")
    .is("baseline_price", null)
    .eq("status", "active");
  if (category) query = query.eq("category_slug", category);
  const { data, error } = await query;
  if (error || !data) {
    console.error("getCuratedDeals error:", error?.message);
    return [];
  }
  const deals = data.map((row) => rowToDeal(row, []));
  return sortActive(deals, sort);
}

/** 상세 페이지용: 딜 1건 + 가격 이력 */
export async function getDeal(id: number): Promise<Deal | null> {
  if (!supabase) return null;

  const { data: row } = await supabase
    .from("v_active_deals")
    .select("*")
    .eq("deal_id", id)
    .single();
  if (!row) {
    const { data: archived } = await supabase
      .from("hot_deals")
      .select("*, products(*, categories(slug, name))")
      .eq("id", id)
      .single();
    if (!archived) return null;

    const product = (archived as any).products ?? {};
    const category = product.categories ?? {};
    const { data: stats } = await supabase
      .from("deal_stats")
      .select("like_count, click_count")
      .eq("product_id", product.id)
      .single();

    const joined = {
      ...archived,
      deal_id: archived.id,
      product_id: product.id,
      platform: product.platform,
      mall_name: product.mall_name,
      shipping_fee: product.shipping_fee,
      unit_price: product.unit_price,
      title: product.title,
      image_url: product.image_url,
      affiliate_url: product.affiliate_url,
      product_url: product.product_url,
      category_slug: category.slug,
      category_name: category.name,
      like_count: stats?.like_count ?? 0,
      click_count: stats?.click_count ?? 0,
    };
    return rowToDeal(
      joined,
      await getPriceHistory(Number(product.id))
    );
  }

  return rowToDeal(row, await getPriceHistory(row.product_id));
}

async function getPriceHistory(productId: number): Promise<PricePoint[]> {
  if (!supabase) return [];
  const { data: hist } = await supabase
    .from("price_history")
    .select("price, collected_at")
    .eq("product_id", productId)
    .order("collected_at", { ascending: true });

  return (hist ?? []).map((h: any) => ({
    price: h.price,
    collectedAt: h.collected_at,
  }));
}

/** 가장 최근 가격 수집 시각(ISO) — "실시간 추적 중"을 보여주기 위함. */
export async function getLastPriceUpdate(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("price_history")
    .select("collected_at")
    .order("collected_at", { ascending: false })
    .limit(1);
  return data?.[0]?.collected_at ?? null;
}
