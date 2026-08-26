import type { MetadataRoute } from "next";

// 커스텀 도메인 정해지면 Vercel 환경변수 NEXT_PUBLIC_SITE_URL 로 덮어씀
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ped-alpha.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
