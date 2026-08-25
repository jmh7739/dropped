import type { MetadataRoute } from "next";

// 사이트 도메인이 정해지면 Vercel 환경변수 NEXT_PUBLIC_SITE_URL 로 설정
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
