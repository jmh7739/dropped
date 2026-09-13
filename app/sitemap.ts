import type { MetadataRoute } from "next";
import { getDeals } from "@/lib/deals";
import { SITE_URL } from "@/lib/site";
import { CATEGORIES } from "@/lib/types";
import { headlineDropRate, isVerifiedBestDeal } from "@/lib/dropMetrics";
import { GUIDES } from "@/lib/guides";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const deals = await getDeals();
  const verified = deals.filter(isVerifiedBestDeal);
  const categoryCounts = new Map<string, number>();
  for (const deal of deals) categoryCounts.set(deal.categorySlug, (categoryCounts.get(deal.categorySlug) ?? 0) + 1);
  const hasDomestic = verified.some((d) => d.platform !== "aliexpress");
  const hasGlobal = verified.some((d) => d.platform === "aliexpress");
  const hasLowest = deals.some((d) => (d.isLowestEver || Boolean(d.min90Price && d.currentPrice <= d.min90Price)) && (d.trackedDays ?? 0) >= 7 && (d.historyPointCount ?? 0) >= 10);
  const hasDrop = deals.some((d) => headlineDropRate(d) >= 25 && (d.trackedDays ?? 0) >= 7 && (d.historyPointCount ?? 0) >= 10);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/guides`, changeFrequency: "monthly", priority: 0.6 },
    ...GUIDES.map((guide) => ({ url: `${SITE_URL}/guides/${guide.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
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

  const dealRoutes: MetadataRoute.Sitemap = deals
    .filter((d) => {
      const checked = d.checkedAt ? new Date(d.checkedAt).getTime() : 0;
      return d.status === "active" && (d.trackedDays ?? 0) >= 7 &&
        (d.historyPointCount ?? 0) >= 10 && checked > 0 &&
        Date.now() - checked <= 14 * 86400000;
    })
    .map((d) => ({
      url: `${SITE_URL}/price/${d.productId}`,
      lastModified: d.checkedAt ?? d.detectedAt,
      changeFrequency: "daily" as const,
      priority: (d.trackedDays ?? 0) >= 7 ? 0.8 : 0.5,
    }));

  return [...staticRoutes, ...dealRoutes];
}
