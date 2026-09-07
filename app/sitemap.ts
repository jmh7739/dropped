import type { MetadataRoute } from "next";
import { getDeals } from "@/lib/deals";
import { SITE_URL } from "@/lib/site";
import { CATEGORIES } from "@/lib/types";

// Supabase 읽기가 no-store라 요청 시 렌더(dynamic). 최신 딜을 항상 반영.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const deals = await getDeals();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    // 쇼핑 카테고리 필터 페이지 (자체 canonical 존재)
    { url: `${SITE_URL}/?category=flight`, changeFrequency: "hourly", priority: 0.7 },
    { url: `${SITE_URL}/?category=auction`, changeFrequency: "daily", priority: 0.7 },
    ...CATEGORIES.filter((c) => c.dealType === "shopping").map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];

  const dealRoutes: MetadataRoute.Sitemap = deals.map((d) => ({
    url: `${SITE_URL}/price/${d.productId}`,
    lastModified: d.detectedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...dealRoutes];
}
