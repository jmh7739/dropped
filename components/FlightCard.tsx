import { FlightDeal } from "@/lib/types";
import { formatWon, safeUrl } from "@/lib/format";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}(${WEEK[d.getDay()]})`;
}

export default function FlightCard({ flight }: { flight: FlightDeal }) {
  const roundTrip = Boolean(flight.returnDate);

  return (
    <a
      href={safeUrl(flight.dealUrl)}
      target="_blank"
      rel="nofollow noopener noreferrer"
      className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md"
    >
      <div className="flex items-center gap-1.5 text-[11px]">
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
          <span className="text-xl font-extrabold text-brand">
            {flight.price ? formatWon(flight.price) : "가격 문의"}
          </span>
          <span className="ml-1 text-[11px] text-gray-400">
            {roundTrip ? "왕복 예상가~" : "편도 예상가~"}
          </span>
        </div>
        <span className="text-xs text-gray-400">{flight.source}</span>
      </div>
    </a>
  );
}
