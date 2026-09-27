"use client";

import { useEffect, useState } from "react";

function directImageUrl(value: string): string {
  const raw = String(value || "").trim().replace(/^http:\/\//i, "https://");
  try {
    const parsed = new URL(raw);
    const source = parsed.hostname === "search.pstatic.net" && parsed.pathname === "/sunny"
      ? parsed.searchParams.get("src") || ""
      : "";
    if (/^https?:\/\//i.test(source) && /(?:^|\.)coupangcdn\.com$/i.test(new URL(source).hostname)) {
      return source;
    }
  } catch {}
  return raw;
}

/**
 * 외부 상품 이미지는 핫링크 차단·만료로 자주 깨진다.
 * 로드 실패 시 회색 자리표시(아이콘)로 대체한다.
 */
export default function SafeImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const resolvedSrc = directImageUrl(src);
  const [failed, setFailed] = useState(!resolvedSrc);

  useEffect(() => {
    setFailed(!resolvedSrc);
  }, [resolvedSrc]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-gray-300 ${className ?? ""}`}
        aria-label={alt}
      >
        <span className="text-2xl">🖼️</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      // 상품 CDN은 원본이 정상이어도 Vercel 이미지 변환 한도나 리퍼러 검사로
      // 실패할 수 있으므로 원본을 브라우저에서 직접 불러온다.
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
