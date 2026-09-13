import type { MetadataRoute } from "next";
import { getDeals } from "@/lib/deals";
import { SITE_URL } from "@/lib/site";
import { CATEGORIES } from "@/lib/types";
import { isVerifiedBestDeal } from "@/lib/dropMetrics";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const deals = await getDeals();
  const verified = deals.filter(isVerifiedBestDeal);
  const activeCategories = new Set(deals.map((d) => d.categorySlug));
  const hasDomestic = verified.some((d) => d.platform !== "aliexpress");
  const hasGlobal = verified.some((d) => d.platform === "aliexpress");
  const hasLowest = deals.some((d) => d.isLowestEver && (d.trackedDays ?? 0) >= 7);
  const hasDrop = deals.some((d) => (d.discountVsAvg ?? 0) >= 25 && (d.trackedDays ?? 0) >= 7);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    ...(verified.length ? [{ url: `${SITE_URL}/deals`, changeFrequency: "hourly" as const, priority: 0.9 }] : []),
    ...(hasDomestic ? [{ url: `${SITE_URL}/deals/domestic`, changeFrequency: "hourly" as const, priority: 0.8 }] : []),
    ...(hasGlobal ? [{ url: `${SITE_URL}/deals/global`, changeFrequency: "hourly" as const, priority: 0.8 }] : []),
    ...(hasLowest ? [{ url: `${SITE_URL}/lowest-price`, changeFrequency: "hourly" as const, priority: 0.9 }] : []),
    ...(hasDrop ? [{ url: `${SITE_URL}/price-drop`, changeFrequency: "hourly" as const, priority: 0.9 }] : []),
    ...CATEGORIES.filter((c) => c.dealType === "shopping" && activeCategories.has(c.slug)).map((c) => ({
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
