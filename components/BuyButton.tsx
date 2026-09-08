"use client";

import { trackClick, trackEvent } from "@/lib/engagementClient";
import { safeUrl } from "@/lib/format";

/**
 * 구매(제휴) 링크 버튼. 클릭 시 클릭수 집계 후 새 탭으로 이동.
 * 카드용(작게)과 상세용(크게) 공용.
 */
export default function BuyButton({
  productId,
  href,
  children,
  className,
  compact = false,
  track = true,
  source,
}: {
  productId: number;
  href: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  track?: boolean; // 골드박스 등 products에 없는 항목은 false
  source?: string;
}) {
  const goHref = track ? `/go/${productId}` : safeUrl(href);

  function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (track) {
      trackEvent("buy_click", { product_id: productId, source: source ?? "unknown" });
    }
  }

  return (
    <a
      href={goHref}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      onClick={onClick}
      className={
        className ??
        (compact
          ? "block rounded-lg bg-brand py-1.5 text-center text-xs font-bold text-white transition hover:bg-brand-dark"
          : "block rounded-xl bg-brand py-3.5 text-center text-base font-bold text-white transition hover:bg-brand-dark")
      }
    >
      {children}
    </a>
  );
}
