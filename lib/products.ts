import { supabase } from "./supabase";
import { PricePoint } from "./types";
import { priceStats, buyVerdict, VerdictTier } from "./priceReport";
import { readPriceHistory } from "./priceHistory";
import { cache } from "react";
import { averagePeriodLabel, lowestPeriodLabel } from "./dropMetrics";
import { deriveUnitPrice } from "./unitPrice";

function canonicalMallName(mallName: string | null | undefined, platform: string): string | null {
  const raw = (mallName ?? "").trim();
  const key = raw.toLowerCase();
  if (key === "하이마트" || key === "롯데하이마트") return "롯데하이마트";
  if (key === "예스24" || key === "yes24") return "YES24";
  if (key === "aliexpress" || key === "알리익스프레스") return "AliExpress";
  if (key === "11st" || key === "11번가") return "11번가";
  return raw || (platform === "aliexpress" ? "AliExpress" : null);
}

/**
 * SEO용 '상품 가격 페이지' 데이터 — 딜이 끝나도 유지되는 영구 리포트.
 *   products + price_history에서 직접 뽑아, 검색 유입용 canonical 페이지를 만든다.
 */
export interface ProductReport {
  id: number;
  platform: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  affiliateUrl: string;
  listPrice: number;
  mallName: string | null;
  shippingFee: number | null;
  unitPrice: string | null;
  categorySlug: string;
  categoryName: string;
  currentPrice: number | null;
  history: PricePoint[];
  hasActiveDeal: boolean;
  likeCount: number;
  lastCheckedAt: string | null;
}

export const getProductReport = cache(async function getProductReport(
  id: number
): Promise<ProductReport | null> {
  if (!supabase || !Number.isFinite(id)) return null;

  const { data: p, error } = await supabase
    .from("products")
    .select("*, categories(slug, name)")
    .eq("id", id)
    .single();
  if (error || !p) return null;

  const history = (await readPriceHistory([id])).get(id) ?? [];
  const { data: hd } = await supabase
    .from("hot_deals")
    .select("id")
    .eq("product_id", id)
    .eq("status", "active")
    .limit(1);

  const { data: stats } = await supabase
    .from("deal_stats")
    .select("like_count")
    .eq("product_id", id)
    .single();

  const lastHistory = history[history.length - 1];
  const cat = (p as any).categories;
  return {
    id: p.id,
    platform: p.platform,
    title: p.title,
    imageUrl: p.image_url ?? "",
    productUrl: p.product_url ?? "#",
    affiliateUrl: p.affiliate_url ?? p.product_url ?? "#",
    listPrice: p.list_price ?? 0,
    mallName: p.mall_name ?? null,
    shippingFee: p.shipping_fee ?? null,
    unitPrice: deriveUnitPrice(p.title ?? "", Number(lastHistory?.price ?? p.list_price ?? 0), p.unit_price),
    categorySlug: cat?.slug ?? "",
    categoryName: cat?.name ?? "기타",
    currentPrice: lastHistory?.price ?? null,
    history,
    hasActiveDeal: (hd?.length ?? 0) > 0,
    likeCount: stats?.like_count ?? 0,
    lastCheckedAt: lastHistory?.collectedAt ?? null,
  };
});

/**
 * 상품 검색 결과 1건 — "지금 특가냐"와 무관하게, 추적 이력이 있는 상품을
 *   현재가 + 구매 판정(🟢/🟡/🔴)과 함께 돌려준다. (검색 유입 → /price/[id])
 */
export interface ProductSearchRow {
  id: number;
  title: string;
  imageUrl: string;
  mallName: string | null;
  platform: string;
  categorySlug: string;
  categoryName: string;
  currentPrice: number;
  unitPrice: string | null;
  verdictIcon: string;
  verdictTitle: string;
  verdictTier: VerdictTier;
  verdictCls: string;
  rate: number;
  trackedDays: number;
  averagePrice: number | null;
  lowestPrice: number;
  averageLabel: string;
  lowestLabel: string;
  lastCheckedAt: string;
}

export interface TrackedProductRow extends ProductSearchRow {
  createdAt: string;
}

/**
 * 아직 검증 핫딜이 되지 않은 상품까지 포함한 실제 가격 추적 카탈로그.
 * 판매처 피드에 들어온 상품을 숨기지 않고 현재가·관측 기간과 함께 공개한다.
 */
export const getRecentlyTrackedProducts = cache(async function getRecentlyTrackedProducts(
  limit = 180
): Promise<TrackedProductRow[]> {
  if (!supabase) return [];
  const safeLimit = Math.min(Math.max(limit, 1), 300);
  const { data: prods, error } = await supabase
    .from("products")
    .select("id,title,image_url,mall_name,platform,unit_price,created_at, categories(slug,name)")
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error || !prods?.length) return [];

  const ids = prods.map((p: any) => p.id);
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const byProduct = await readPriceHistory(ids, since);
  const rows: TrackedProductRow[] = [];
  const seen = new Set<string>();
  const gameSoftware = /(?:steam|스팀\s*(?:키|코드|게임)|pc\s*게임|게임\s*타이틀|(?:ps4|ps5|playstation|플레이스테이션)\s*(?:게임|타이틀|소프트)|(?:닌텐도\s*스위치|nintendo\s*switch)\s*(?:게임|타이틀|소프트))/i;

  for (const p of prods as any[]) {
    if (!p.title || gameSoftware.test(p.title)) continue;
    const history = byProduct.get(p.id);
    if (!history?.length) continue;
    const current = history[history.length - 1].price;
    const stats = priceStats(history, current);
    if (!stats || current <= 0) continue;
    const mallName = canonicalMallName(p.mall_name, p.platform);
    const fingerprint = `${p.title.replace(/[^0-9a-z가-힣]/gi, "").toLowerCase()}|${(mallName ?? p.platform).toLowerCase()}|${current}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    const rate = stats.avg30 && stats.avg30 > current
      ? Math.round(((stats.avg30 - current) / stats.avg30) * 100)
      : 0;
    const v = buyVerdict(rate, stats.isLowest, stats.lowestLabel, stats.enoughData);
    const cat = p.categories;
    rows.push({
      id: p.id,
      title: p.title,
      imageUrl: p.image_url ?? "",
      mallName,
      platform: p.platform,
      categorySlug: cat?.slug ?? "",
      categoryName: cat?.name ?? "기타",
      currentPrice: current,
      unitPrice: deriveUnitPrice(p.title, current, p.unit_price),
      verdictIcon: v.icon,
      verdictTitle: v.title,
      verdictTier: v.tier,
      verdictCls: v.cls,
      rate,
      trackedDays: stats.trackedDays,
      averagePrice: stats.avg30,
      lowestPrice: stats.trackedDays >= 90 ? (stats.min90 ?? stats.minAll) : stats.minAll,
      averageLabel: averagePeriodLabel(stats.trackedDays),
      lowestLabel: lowestPeriodLabel(stats.trackedDays),
      lastCheckedAt: history[history.length - 1].collectedAt,
      createdAt: p.created_at,
    });
  }
  return rows;
});

/**
 * 제목으로 '가격 추적 중인 상품'을 검색한다. 활성 딜만 보는 getDeals와 달리,
 *   딜이 아니어도(가격 원복돼도) 이력만 있으면 잡아 가격 판정을 붙인다.
 *   외부 API 없이 products + price_history(anon 읽기)만으로 동작.
 */
export async function searchProducts(
  q: string,
  limit = 24
): Promise<ProductSearchRow[]> {
  if (!supabase) return [];
  const term = q.trim();
  if (term.length < 2) return [];
  // ilike 와일드카드(%, _)는 이스케이프해 사용자 입력이 패턴으로 새지 않게.
  const pattern = `%${term.replace(/[%_\\]/g, (m) => "\\" + m)}%`;

  const { data: prods, error } = await supabase
    .from("products")
    .select("id,title,image_url,mall_name,platform,unit_price, categories(slug,name)")
    .ilike("title", pattern)
    .limit(40);
  if (error || !prods || prods.length === 0) return [];

  const ids = prods.map((p: any) => p.id);
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const byProduct = await readPriceHistory(ids, since);

  const rows: ProductSearchRow[] = [];
  for (const p of prods as any[]) {
    const history = byProduct.get(p.id);
    if (!history || history.length === 0) continue; // 이력 없으면 상세가 404 → 제외
    const current = history[history.length - 1].price;
    const stats = priceStats(history, current);
    if (!stats) continue;
    const rate =
      stats.avg30 && stats.avg30 > current
        ? Math.round(((stats.avg30 - current) / stats.avg30) * 100)
        : 0;
    const v = buyVerdict(rate, stats.isLowest, stats.lowestLabel, stats.enoughData);
    const cat = p.categories;
    rows.push({
      id: p.id,
      title: p.title,
      imageUrl: p.image_url ?? "",
      mallName: canonicalMallName(p.mall_name, p.platform),
      platform: p.platform,
      categorySlug: cat?.slug ?? "",
      categoryName: cat?.name ?? "기타",
      currentPrice: current,
      unitPrice: deriveUnitPrice(p.title ?? "", current, p.unit_price),
      verdictIcon: v.icon,
      verdictTitle: v.title,
      verdictTier: v.tier,
      verdictCls: v.cls,
      rate,
      trackedDays: stats.trackedDays,
      averagePrice: stats.avg30,
      lowestPrice: stats.trackedDays >= 90 ? (stats.min90 ?? stats.minAll) : stats.minAll,
      averageLabel: averagePeriodLabel(stats.trackedDays),
      lowestLabel: lowestPeriodLabel(stats.trackedDays),
      lastCheckedAt: history[history.length - 1].collectedAt,
    });
  }

  // 살 만한 것(🟢) → 괜찮음 → 대기 순, 같은 등급이면 하락률 큰 순.
  const order: Record<VerdictTier, number> = { buy: 0, ok: 1, wait: 2 };
  rows.sort(
    (a, b) => order[a.verdictTier] - order[b.verdictTier] || b.rate - a.rate
  );
  return rows.slice(0, limit);
}
