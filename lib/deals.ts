import { supabase } from "./supabase";
import { Deal, PricePoint, HOT_LIKE_THRESHOLD } from "./types";
import { headlineDropRate, hotDealScore, dropScore } from "./dropMetrics";
import { readPriceHistory } from "./priceHistory";

export type SortKey =
  | "discount" // 하락률 높은순 (기본)
  | "popular" // 인기순 (클릭·좋아요) = '추천'
  | "score" // DROP SCORE 높은순
  | "discount_asc" // 할인률 낮은순
  | "price_asc" // 가격 낮은순
  | "price_desc" // 가격 높은순
  | "recent"; // 최신순

export const DEAL_SORTS: { key: SortKey; label: string }[] = [
  { key: "discount", label: "할인율 높은순" },
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
    avg30Price: row.avg30_price != null ? Number(row.avg30_price) : null,
    min90Price: row.min90_price != null ? Number(row.min90_price) : null,
    max90Price: row.max90_price != null ? Number(row.max90_price) : null,
    trackedDays: row.tracked_days != null ? Number(row.tracked_days) : null,
    historyPointCount:
      row.history_points != null ? Number(row.history_points) : null,
    history,
    likeCount: Number(row.like_count ?? 0),
    clickCount: Number(row.click_count ?? 0),
    // baseline 없음 = 가격추적 급락딜이 아닌 'MD 추천 특가'(국내몰 큐레이션)
    isCurated: row.baseline_price == null,
  };
}

export function sortDealList(deals: Deal[], sort: SortKey): Deal[] {
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
    case "score":
      return arr.sort(
        (a, b) => (dropScore(b).score ?? -1) - (dropScore(a).score ?? -1)
      );
    case "recent":
      // 사용자가 카드에서 보는 "확인" 시간 기준 최신순.
      // 감지 시간(detectedAt)만 쓰면 오래전에 감지된 딜이 방금 확인됐어도
      // 아래로 밀려 "최신순이 아닌 것처럼" 보인다.
      return arr.sort((a, b) => {
        const t =
          new Date(b.checkedAt ?? b.detectedAt).getTime() -
          new Date(a.checkedAt ?? a.detectedAt).getTime();
        if (t !== 0) return t;
        const detected =
          new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
        return detected !== 0 ? detected : headlineRate(b) - headlineRate(a);
      });
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

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^\w가-힯ㄱ-ㅣ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2)
  );
}

function wordSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const w of a) if (b.has(w)) common++;
  return common / Math.min(a.size, b.size);
}

function charBigrams(title: string): Set<string> {
  const clean = title.toLowerCase().replace(/[^가-힯a-z0-9]/g, "");
  const grams = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) grams.add(clean.slice(i, i + 2));
  return grams;
}

function bigramSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size < 3 || b.size < 3) return 0;
  let common = 0;
  for (const g of a) if (b.has(g)) common++;
  return common / Math.min(a.size, b.size);
}

function isSimilar(
  wordsA: Set<string>, bigramsA: Set<string>,
  wordsB: Set<string>, bigramsB: Set<string>,
): boolean {
  return wordSimilarity(wordsA, wordsB) >= 0.5 || bigramSimilarity(bigramsA, bigramsB) >= 0.4;
}

function dedupSimilar(deals: Deal[], sort: SortKey = "discount"): Deal[] {
  // 같은 몰(플랫폼) 안에서만 유사중복(같은 상품 중복 리스팅)을 제거한다.
  //   다른 몰의 같은 상품은 가격·링크가 다른 별개 딜이라 유지 → 교차몰 오병합 방지.
  const byPlatform = new Map<string, Deal[]>();
  for (const deal of deals) {
    const arr = byPlatform.get(deal.platform);
    if (arr) arr.push(deal);
    else byPlatform.set(deal.platform, [deal]);
  }

  const out: Deal[] = [];
  for (const group of byPlatform.values()) {
    // 중복 묶음에서 남길 대표:
    // - 최신순에서는 가장 최근 확인된 상품을 남겨야 사용자가 기대하는 정렬과 맞다.
    // - 그 외에는 DROP 점수(하락률·신뢰도) 높은 것 우선.
    group.sort((a, b) => {
      if (sort === "recent") {
        const t =
          new Date(b.checkedAt ?? b.detectedAt).getTime() -
          new Date(a.checkedAt ?? a.detectedAt).getTime();
        if (t !== 0) return t;
      }
      const s = hotDealScore(b) - hotDealScore(a);
      return s !== 0 ? s : new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });
    const keptWords: Set<string>[] = [];
    const keptBigrams: Set<string>[] = [];
    for (const deal of group) {
      const words = titleWords(deal.title);
      const bigrams = charBigrams(deal.title);
      const isDup = keptWords.some((kw, i) => isSimilar(words, bigrams, kw, keptBigrams[i]));
      if (isDup) continue;
      out.push(deal);
      keptWords.push(words);
      keptBigrams.push(bigrams);
    }
  }

  // 최종 정렬은 호출부의 sortDeals/sortActive가 다시 하므로 순서는 그대로 반환.
  return out;
}

export function diversifyTop(sorted: Deal[], limit: number, maxPerCat = 2): Deal[] {
  const result: Deal[] = [];
  const catCount: Record<string, number> = {};
  const keptWords: Set<string>[] = [];
  const keptBigrams: Set<string>[] = [];

  for (const deal of sorted) {
    if (result.length >= limit) break;
    const cat = deal.categorySlug || "other";
    if ((catCount[cat] || 0) >= maxPerCat) continue;

    const words = titleWords(deal.title);
    const bigrams = charBigrams(deal.title);
    const isDup = keptWords.some((kw, i) => isSimilar(words, bigrams, kw, keptBigrams[i]));
    if (isDup) continue;

    result.push(deal);
    catCount[cat] = (catCount[cat] || 0) + 1;
    keptWords.push(words);
    keptBigrams.push(bigrams);
  }
  return result;
}

// 가격 '상태' 필터 — 상품종류가 아니라 "얼마나 싼가"로 거른다(떨어졌다의 핵심).
export type PriceStatusKey = "plunge" | "lowest" | "bigdrop" | "fresh";
export const PRICE_STATUS: { key: PriceStatusKey; label: string }[] = [
  { key: "plunge", label: "오늘 급락" },
  { key: "lowest", label: "추적 최저가" },
  { key: "bigdrop", label: "💸 많이 하락" },
  { key: "fresh", label: "⏱ 방금 떨어짐" },
];

function matchesPriceStatus(d: Deal, ps: PriceStatusKey): boolean {
  const r = headlineRate(d);
  switch (ps) {
    case "plunge":
      return r >= 25;
    case "lowest":
      return d.isLowestEver || Boolean(d.min90Price && d.currentPrice <= d.min90Price);
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
  scope?: "domestic" | "overseas";
}

/** 홈/카테고리 리스트용 딜 목록 (그래프 이력은 상세에서만 로드) */
export async function getDeals(opts: GetDealsOpts = {}): Promise<Deal[]> {
  const { category, sort = "discount", hotOnly = false, q, priceStatus, scope } = opts;
  const term = q?.trim().toLowerCase();

  // Supabase 미연결 시 빈 목록 (가짜 데이터 없음)
  if (!supabase) return [];

  let query = supabase
    .from("v_active_deals")
    .select("*")
    .not("baseline_price", "is", null) // 급락딜만(추천딜=baseline null은 제외)
    .eq("status", "active");
  if (category) query = query.eq("category_slug", category);
  if (hotOnly) query = query.gte("like_count", HOT_LIKE_THRESHOLD);
  if (term) query = query.ilike("title", `%${term}%`);
  if (scope === "domestic") query = query.neq("platform", "aliexpress");
  if (scope === "overseas") query = query.eq("platform", "aliexpress");
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
  deals = dedupSimilar(deals, sort);
  return sortDealList(deals, sort);
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
  const deals = dedupSimilar(data.map((row) => rowToDeal(row, [])), sort);
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
  return (await readPriceHistory([productId])).get(productId) ?? [];
}

/** 같은 카테고리 관련 딜 — 중복 제거 + DROP 점수 좋은 순 */
export async function getRelatedDeals(
  categorySlug: string,
  excludeProductId: number,
  limit = 6
): Promise<Deal[]> {
  if (!supabase || !categorySlug) return [];
  const { data } = await supabase
    .from("v_active_deals")
    .select("*")
    .eq("category_slug", categorySlug)
    .eq("status", "active")
    .neq("product_id", excludeProductId)
    .limit(limit * 3);
  if (!data) return [];
  const deals = data.map((row) => rowToDeal(row, []));
  return diversifyTop(
    deals.sort((a, b) => hotDealScore(b) - hotDealScore(a)),
    limit,
    limit,
  );
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
