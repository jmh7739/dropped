import Link from "next/link";
import { getFlightDeals, FlightScope } from "@/lib/flights";
import FlightCard from "./FlightCard";

const TABS: { key: FlightScope; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "domestic", label: "국내선" },
  { key: "intl", label: "국제선" },
];

function href(scope: FlightScope) {
  return scope === "all"
    ? "/?category=flight"
    : `/?category=flight&fc=${scope}`;
}

export default async function FlightsView({ scope }: { scope: FlightScope }) {
  const flights = await getFlightDeals(scope);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              scope === t.key
                ? "bg-brand text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {flights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
          아직 감지된 항공권 특가가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flights.map((f) => (
            <FlightCard key={f.id} flight={f} />
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-gray-400">
        항공권 특가는 실시간 요금 제휴사에서 모은 정보이며, 실제 가격·좌석은 예약
        페이지에서 확인하세요.
      </p>
    </div>
  );
}
