/**
 * SEO, 공유, 피드에서 동일하게 사용하는 대표 도메인.
 * 실제 배포는 https://dropped.kr(non-www)가 표준이며, www 는 Vercel에서
 * non-www 로 리다이렉트된다. 여기 하나로 통일해 www/non-www 혼용을 막는다.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://dropped.kr"
).replace(/\/$/, "");

