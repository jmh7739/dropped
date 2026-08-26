import type { MetadataRoute } from "next";
import { getDeals } from "@/lib/deals";
import { CATEGORIES } from "@/lib/types";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ped-alpha.vercel.app";

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const deals = await getDeals();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    ...CATEGORIES.filter((c) => c.dealType === "shopping").map((c) => ({
      url: `${SITE_URL}/?category=${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];

  const dealRoutes: MetadataRoute.Sitemap = deals.map((d) => ({
    url: `${SITE_URL}/deal/${d.id}`,
    lastModified: d.detectedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...dealRoutes];
}
