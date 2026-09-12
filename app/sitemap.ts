import type { MetadataRoute } from "next";
import { getDeals } from "@/lib/deals";
import { SITE_URL } from "@/lib/site";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const deals = await getDeals();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/deals`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/deals/domestic`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/deals/global`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/lowest-price`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/price-drop`, changeFrequency: "hourly", priority: 0.9 },
    ...CATEGORIES.filter((c) => c.dealType === "shopping").map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];

  const dealRoutes: MetadataRoute.Sitemap = deals
    .filter((d) => d.status === "active" && (d.trackedDays ?? 0) >= 3)
    .map((d) => ({
      url: `${SITE_URL}/price/${d.productId}`,
      lastModified: d.checkedAt ?? d.detectedAt,
      changeFrequency: "daily" as const,
      priority: (d.trackedDays ?? 0) >= 7 ? 0.8 : 0.5,
    }));

  return [...staticRoutes, ...dealRoutes];
}
