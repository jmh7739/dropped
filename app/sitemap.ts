import type { MetadataRoute } from "next";
import { getRetailCatalog } from '@/lib/retailCatalog';
import { isDiscoverableRetailOffer } from '@/lib/retail';
import { getDeals } from "@/lib/deals";
import { SITE_URL } from "@/lib/site";
import { CATEGORIES } from "@/lib/types";
import { headlineDropRate, isVerifiedBestDeal } from "@/lib/dropMetrics";
import { GUIDES } from "@/lib/guides";
import { getPriceInsights } from "@/lib/insights";
import { priceStats } from "@/lib/priceReport";
import { readPriceHistory } from "@/lib/priceHistory";
import { supabase } from "@/lib/supabase";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A failed upstream price-history request must never turn the whole sitemap
  // into a 500. Stable editorial URLs remain discoverable while data recovers.
  const deals = await getDeals().catch((error) => {
    console.error("sitemap deals unavailable:", error);
    return [];
  });
  const insights = await getPriceInsights().catch((error) => {
    console.error("sitemap insights unavailable:", error);
    return [];
  });
  const verified = deals.filter(isVerifiedBestDeal);
  const categoryCounts = new Map<string, number>();
  for (const deal of verified) categoryCounts.set(deal.categorySlug, (categoryCounts.get(deal.categorySlug) ?? 0) + 1);
  const hasDomestic = verified.some((d) => d.platform !== "aliexpress");
  const hasGlobal = verified.some((d) => d.platform === "aliexpress");
  const hasLowest = deals.some((d) => (d.isLowestEver || Boolean(d.min90Price && d.currentPrice <= d.min90Price)) && (d.trackedDays ?? 0) >= 14 && (d.historyPointCount ?? 0) >= 20);
  const hasDrop = deals.some((d) => headlineDropRate(d) >= 25 && (d.trackedDays ?? 0) >= 14 && (d.historyPointCount ?? 0) >= 20);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/store-deals`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/store-deals/calendar`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/guides`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/unit-price`, changeFrequency: "monthly", priority: 0.75 },
    ...GUIDES.map((guide) => ({ url: `${SITE_URL}/guides/${guide.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...(insights.length >= 3 ? [{ url: `${SITE_URL}/insights`, changeFrequency: "daily" as const, priority: 0.8 }] : []),
    ...(hasDomestic ? [{ url: `${SITE_URL}/deals/domestic`, changeFrequency: "hourly" as const, priority: 0.8 }] : []),
    ...(hasGlobal ? [{ url: `${SITE_URL}/deals/global`, changeFrequency: "hourly" as const, priority: 0.8 }] : []),
    ...(hasLowest ? [{ url: `${SITE_URL}/lowest-price`, changeFrequency: "hourly" as const, priority: 0.9 }] : []),
    ...(hasDrop ? [{ url: `${SITE_URL}/price-drop`, changeFrequency: "hourly" as const, priority: 0.9 }] : []),
    ...CATEGORIES.filter((c) => c.dealType === "shopping" && (categoryCounts.get(c.slug) ?? 0) >= 3).map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];

  // The home list removes similar deal cards. A product can still have a valid
  // price report even when its card was deduplicated, so use the raw active
  // product IDs before applying the same history test as /price/[id].
  const candidateIds = new Set(deals
    .filter((deal) => deal.status === "active" && !deal.isPriceError)
    .map((deal) => deal.productId));
  if (supabase) {
    try {
      for (let offset = 0; offset < 3000; offset += 1000) {
        const { data, error } = await supabase.from("v_active_deals")
          .select("product_id").eq("status", "active").range(offset, offset + 999);
        if (error) throw error;
        for (const row of data ?? []) candidateIds.add(Number(row.product_id));
        if (!data || data.length < 1000) break;
      }
    } catch (error) {
      console.error("sitemap active product IDs unavailable:", error);
    }
    try {
      // Popular-feed products keep useful price histories after their deal card
      // ends. Their canonical pages may still be indexable, so include them in
      // the same history check instead of limiting the sitemap to active deals.
      for (let offset = 0; offset < 3000; offset += 1000) {
        const { data, error } = await supabase.from("products")
          .select("id").eq("platform", "cps")
          .like("external_product_id", "pp_%").range(offset, offset + 999);
        if (error) throw error;
        for (const row of data ?? []) candidateIds.add(Number(row.id));
        if (!data || data.length < 1000) break;
      }
    } catch (error) {
      console.error("sitemap popular product IDs unavailable:", error);
    }
  }
  const candidates = [...candidateIds].filter((id) => Number.isSafeInteger(id) && id > 0);
  const indexableProducts = new Map<number, string>();
  const batches: number[][] = [];
  for (let offset = 0; offset < candidates.length; offset += 100) batches.push(candidates.slice(offset, offset + 100));
  let nextBatch = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (nextBatch < batches.length) {
    const batch = batches[nextBatch++];
    try {
      const histories = await readPriceHistory(batch, new Date(Date.now() - 90 * 86400000).toISOString());
      for (const [id, history] of histories) {
        const latest = history.at(-1);
        if (!latest) continue;
        const checked = new Date(latest.collectedAt).getTime();
        const stats = priceStats(history, latest.price);
        if (stats?.enoughData && Number.isFinite(checked) && Date.now() - checked <= 14 * 86400000) {
          indexableProducts.set(id, latest.collectedAt);
        }
      }
    } catch (error) {
      console.error("sitemap price histories unavailable:", error);
    }
  } }));
  const dealRoutes: MetadataRoute.Sitemap = [...indexableProducts]
    .map(([id, lastModified]) => ({
      url: `${SITE_URL}/price/${id}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

  // Insight reports use the same product-history data as /price/[id]. Include
  // them when the deal view's history was too sparse to qualify above.
  const insightRoutes: MetadataRoute.Sitemap = insights
    .filter(({ product }) => !indexableProducts.has(product.id))
    .map(({ product }) => ({
      url: `${SITE_URL}/price/${product.id}`,
      lastModified: product.lastCheckedAt ?? undefined,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

  const retailRoutes: MetadataRoute.Sitemap = await getRetailCatalog().then(({catalog}) =>
    [...new Map(catalog.offers.filter(o => isDiscoverableRetailOffer(o)).map(o => [o.id, o])).values()]
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt)).slice(0, 120)
      .map(o => ({url: `${SITE_URL}/store-deals/${encodeURIComponent(o.id)}`, lastModified: o.lastSeenAt, changeFrequency: 'daily' as const, priority: 0.7}))
  ).catch(() => []); // Keep existing discovery routes available if a feed fails.
  return [...staticRoutes, ...dealRoutes, ...insightRoutes, ...retailRoutes];
}
