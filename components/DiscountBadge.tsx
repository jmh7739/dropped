import { formatPercent, formatWon, dealStatus } from "@/lib/format";

/** Deal 상태 뱃지 (🏆 최근최저 / 🔥 급락 / 🟢 좋은 가격 / 📉 소폭). */
export function StatusBadge({
  rate,
  isLowestEver,
}: {
  rate: number;
  isLowestEver: boolean;
}) {
  const { label, cls } = dealStatus(rate, isLowestEver);
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold shadow-sm ring-1 ring-white/70 ${cls}`}
    >
      {label}
    </span>
  );
}

export function DiscountBadge({
  rate,
  basis,
}: {
  rate: number;
  basis: "최근 평균" | "정가";
}) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
      <span className="text-[10px]">🔻</span>
      {basis} 대비 {formatPercent(rate)}
    </span>
  );
}

/** 정가 기준으로만 노출된 잠정딜(아직 실판매가 이력 미검증) 표시. */
export function ProvisionalBadge() {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500"
      title="아직 평소 판매가 이력이 없어 정가 기준으로만 표시한 잠정 특가입니다. 며칠 뒤 실판매가 기준으로 자동 검증됩니다."
    >
      🕒 정가기준·검증중
    </span>
  );
}

export function LowestEverBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-amber-950">
      🏆 최근 최저가
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
      배송 {formatWon(fee)}
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
