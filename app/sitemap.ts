import type { MetadataRoute } from "next";
import { getDeals } from "@/lib/deals";
import { SITE_URL } from "@/lib/site";
import { CATEGORIES } from "@/lib/types";
import { headlineDropRate, isVerifiedBestDeal } from "@/lib/dropMetrics";
import { GUIDES } from "@/lib/guides";
import { getPriceInsights } from "@/lib/insights";
import { priceStats } from "@/lib/priceReport";
import { readPriceHistory } from "@/lib/priceHistory";

export const dynamic = "force-dynamic";

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
  for (const deal of deals) categoryCounts.set(deal.categorySlug, (categoryCounts.get(deal.categorySlug) ?? 0) + 1);
  const hasDomestic = verified.some((d) => d.platform !== "aliexpress");
  const hasGlobal = verified.some((d) => d.platform === "aliexpress");
  const hasLowest = deals.some((d) => (d.isLowestEver || Boolean(d.min90Price && d.currentPrice <= d.min90Price)) && (d.trackedDays ?? 0) >= 14 && (d.historyPointCount ?? 0) >= 20);
  const hasDrop = deals.some((d) => headlineDropRate(d) >= 25 && (d.trackedDays ?? 0) >= 14 && (d.historyPointCount ?? 0) >= 20);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/guides`, changeFrequency: "monthly", priority: 0.6 },
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

  // getDeals intentionally returns lightweight cards with history: []. Fetch
  // candidate histories separately, using the same threshold as /price/[id].
  const candidates = [...new Set(deals
    .filter((deal) => deal.status === "active" && !deal.isPriceError &&
      (deal.trackedDays ?? 0) >= 14 && (deal.historyPointCount ?? 0) >= 20)
    .map((deal) => deal.productId))];
  const indexableProducts = new Map<number, string>();
  for (let offset = 0; offset < candidates.length; offset += 25) {
    try {
      const histories = await readPriceHistory(candidates.slice(offset, offset + 25));
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
  }
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

  return [...staticRoutes, ...dealRoutes, ...insightRoutes];
}
