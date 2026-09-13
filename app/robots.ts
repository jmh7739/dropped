import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 목록 필터 URL은 meta noindex를 읽을 수 있어야 하므로 robots.txt에서 막지 않는다.
      disallow: ["/go/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
