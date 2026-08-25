import { formatPercent } from "@/lib/format";

export function DiscountBadge({
  rate,
  basis,
}: {
  rate: number;
  basis: "평균가" | "정가";
}) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
      <span className="text-[10px]">🔻</span>
      {basis} 대비 {formatPercent(rate)}
    </span>
  );
}

export function LowestEverBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-amber-950">
      🏆 역대최저가
    </span>
  );
}

export function ShippingBadge({ fee }: { fee: number | null }) {
  if (fee === null) return null;
  if (fee === 0) {
    return (
      <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-700">
        무료배송
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
      배송 {fee.toLocaleString("ko-KR")}원
    </span>
  );
}

export function PriceErrorBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs font-bold text-red-600">
      ⚠️ 가격오류 의심
    </span>
  );
}
