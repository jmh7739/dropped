import type { Metadata } from "next";

export const SITE_NAME = "떨어졌다";
export const DEFAULT_TITLE = "떨어졌다 — 가격 이력으로 확인하는 특가·핫딜";
export const DEFAULT_DESCRIPTION =
  "수집한 가격 이력으로 쇼핑 상품의 현재가와 평소 가격을 비교합니다. 추적 기간, DROP SCORE, 가격 그래프와 마트·편의점 행사 조건을 확인하세요.";
export const DEFAULT_OG_IMAGE = { url: "/og-default.png", width: 1200, height: 630, alt: "Dropped(떨어졌다) — 가격 이력으로 확인하는 진짜 할인" };

function plainTitle(title: Metadata["title"]): string | null {
  if (!title) return null;
  if (typeof title === "string") return title;
  if ("absolute" in title && title.absolute) return title.absolute;
  if ("default" in title && title.default) return title.default;
  return null;
}

/**
 * 페이지마다 og:title·og:description·og:url·og:image를 채운다. 페이지가 이미 정한
 * Open Graph 값(예: 상품 이미지)은 그대로 두고 빈 항목만 채운다.
 */
export function withOg(meta: Metadata): Metadata {
  const title = plainTitle(meta.title);
  const fullTitle = !title ? DEFAULT_TITLE : title.includes(SITE_NAME) || title.includes("Dropped") ? title : `${title} | ${SITE_NAME}`;
  const description = meta.description ?? DEFAULT_DESCRIPTION;
  const canonical = meta.alternates?.canonical;
  const url = typeof canonical === "string" ? canonical : canonical instanceof URL ? canonical.toString() : undefined;
  const og = meta.openGraph ?? {};
  const images = og.images && (!Array.isArray(og.images) || og.images.length) ? og.images : [DEFAULT_OG_IMAGE];
  return {
    ...meta,
    openGraph: {
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
      ...og,
      title: og.title ?? fullTitle,
      description: og.description ?? description,
      ...(url && !og.url ? { url } : {}),
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: (Array.isArray(images) ? images : [images]).map((i) => (typeof i === "string" || i instanceof URL ? i : i.url)),
      ...meta.twitter,
    },
  };
}
