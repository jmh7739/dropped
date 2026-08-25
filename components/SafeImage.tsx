"use client";

import { useState } from "react";

/**
 * 외부 상품 이미지는 핫링크 차단·만료로 자주 깨진다.
 * 로드 실패 시 회색 자리표시(아이콘)로 대체한다.
 */
export default function SafeImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(!src);

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
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
