import type { MetadataRoute } from "next";
import { getDeals } from "@/lib/deals";
import { CATEGORIES } from "@/lib/types";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.dropped.kr";

// Supabase 읽기가 no-store라 요청 시 렌더(dynamic). 최신 딜을 항상 반영.
export const dynamic = "force-dynamic";

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
