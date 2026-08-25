import { FlightDeal } from "@/lib/types";
import { formatWon, safeUrl } from "@/lib/format";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export default function FlightCard({ flight }: { flight: FlightDeal }) {
  const dates = flight.returnDate
    ? `${fmtDate(flight.departDate)}~${fmtDate(flight.returnDate)}`
    : `${fmtDate(flight.departDate)} 편도`;

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
        {flight.airline && (
          <span className="text-gray-500">{flight.airline}</span>
        )}
      </div>

      <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
        <span>{flight.origin}</span>
        <span className="text-brand">✈</span>
        <span>{flight.destination}</span>
      </div>

      <div className="text-xs text-gray-500">{dates}</div>

      <div className="mt-1 flex items-end justify-between">
        <span className="text-xl font-extrabold text-brand">
          {flight.price ? formatWon(flight.price) : "가격 문의"}
        </span>
        <span className="text-xs text-gray-400">{flight.source}</span>
      </div>
    </a>
  );
}
