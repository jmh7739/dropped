import Link from "next/link";
import { PRICE_STATUS, PriceStatusKey, SortKey } from "@/lib/deals";
import { homeHref } from "@/lib/nav";

/**
 * 가격 '상태' 빠른 필터 — "얼마나 싼가"로 거르는 떨어졌다의 핵심 필터.
 *   상품종류 카테고리보다 앞에 둔다. 같은 칩 다시 누르면 해제(전체).
 */
export default function PriceStatusChips({
  active,
  base,
}: {
  active?: PriceStatusKey;
  base: {
    category?: string;
    sort?: SortKey;
    hot?: boolean;
    q?: string;
    showEnded?: boolean;
    cc?: string;
    cs?: string;
  };
}) {
  const chip = (label: string, ps?: PriceStatusKey) => {
    const on = active === ps || (!active && !ps);
    return (
      <Link
        key={label}
        href={homeHref({ ...base, ps, page: 1 })}
        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold transition ${
          on
            ? "bg-brand text-white shadow-sm"
            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
      {chip("전체")}
      {PRICE_STATUS.map((s) => chip(s.label, s.key))}
    </div>
  );
}
