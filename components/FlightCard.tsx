import { FlightDeal } from "@/lib/types";
import { formatWon, safeUrl, timeAgo } from "@/lib/format";
import { stayUrl } from "@/lib/destinations";
import ShareButton from "./ShareButton";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}(${WEEK[d.getDay()]})`;
}

export default function FlightCard({ flight }: { flight: FlightDeal }) {
  const roundTrip = Boolean(flight.returnDate);
  const stayHref = stayUrl(flight.destination);
  // 평소가(중앙값) 대비 하락률 — 이력이 쌓이면 "가격이 떨어졌다" 판정.
  const disc =
    flight.baselinePrice && flight.price && flight.baselinePrice > flight.price
      ? Math.round(
          ((flight.baselinePrice - flight.price) / flight.baselinePrice) * 100
        )
      : 0;

  return (
    <div className="relative flex flex-col rounded-xl border border-gray-200 bg-white transition hover:shadow-md">
      <div className="absolute right-2 top-2 z-10">
        <ShareButton
          path="/?category=flight"
          title={`${flight.origin}→${flight.destination} 항공권 특가`}
          compact
        />
      </div>
      <a
        href={safeUrl(flight.dealUrl)}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="flex flex-col gap-2 p-4"
      >
      <div className="flex items-center gap-1.5 pr-9 text-[11px]">
        <span
          className={`rounded px-1.5 py-0.5 font-bold ${
            flight.isDomestic
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {flight.isDomestic ? "국내선" : "국제선"}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 font-bold ${
            roundTrip ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"
          }`}
        >
          {roundTrip ? "왕복" : "편도"}
        </span>
        {flight.airline && (
          <span className="text-gray-500">{flight.airline}</span>
        )}
        {disc >= 8 && (
          <span
            className={`rounded px-1.5 py-0.5 font-extrabold text-white ${
              disc >= 15 ? "bg-red-600" : "bg-sky-500"
            }`}
          >
            {disc >= 15 ? "🔥" : "📉"} 평소보다 {disc}%↓
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
        <span>{flight.origin}</span>
        <span className="text-brand">✈</span>
        <span>{flight.destination}</span>
      </div>

      <div className="text-xs text-gray-600">
        {roundTrip ? (
          <>
            가는날 {fmtDate(flight.departDate)} · 오는날{" "}
            {fmtDate(flight.returnDate)}
          </>
        ) : (
          <>출발 {fmtDate(flight.departDate)}</>
        )}
      </div>

      <div className="mt-1 flex items-end justify-between">
        <div>
          {disc >= 8 && flight.baselinePrice && (
            <div className="text-[11px] text-gray-400 line-through">
              평소 {formatWon(flight.baselinePrice)}
            </div>
          )}
          <span className="text-xl font-extrabold text-brand">
            {flight.price ? formatWon(flight.price) : "가격 문의"}
          </span>
          <span className="ml-1 text-[11px] text-gray-400">
            {roundTrip ? "왕복 예상가~" : "편도 예상가~"}
          </span>
        </div>
        <span className="text-[11px] text-gray-400" suppressHydrationWarning>
          {flight.postedAt ? `${timeAgo(flight.postedAt)} 시세` : flight.source}
        </span>
      </div>
      </a>
      {stayHref && (
        <a
          href={stayHref}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="flex items-center justify-center gap-1 border-t border-gray-100 px-4 py-2 text-xs font-bold text-gray-500 transition hover:bg-brand/5 hover:text-brand"
        >
          🏨 {flight.destination} 숙소 보기 →
        </a>
      )}
    </div>
  );
}
