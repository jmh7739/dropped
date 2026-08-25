"use client";

import { trackClick } from "@/lib/engagementClient";
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
}: {
  productId: number;
  href: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  function onClick(e: React.MouseEvent) {
    e.stopPropagation(); // 카드 클릭(상세 이동)과 분리
    void trackClick(productId); // 집계는 fire-and-forget
  }

  return (
    <a
      href={safeUrl(href)}
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
