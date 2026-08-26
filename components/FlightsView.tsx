import Link from "next/link";
import {
  getFlightRegions,
  getFlightRoutes,
  getFlightRouteDeals,
  regionEmoji,
} from "@/lib/flights";
import { formatWon } from "@/lib/format";
import FlightCard from "./FlightCard";

const EMPTY = (
  <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
    아직 감지된 항공권 특가가 없습니다.
  </div>
);

const DISCLAIMER = (
  <p className="mt-4 text-[11px] text-gray-400">
    왕복 최저가는 실시간 요금 제휴사(아비아세일즈)에서 모은 정보이며, 실제
    가격·좌석은 예약 페이지에서 확인하세요.
  </p>
);

function Crumb({ region, route }: { region?: string; route?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
      <Link href="/?category=flight" className="font-medium hover:text-brand">
        ✈️ 전체 지역
      </Link>
      {region && (
        <>
          <span className="text-gray-300">›</span>
          <Link
            href={`/?category=flight&region=${encodeURIComponent(region)}`}
            className={route ? "hover:text-brand" : "font-bold text-gray-900"}
          >
            {regionEmoji(region)} {region}
          </Link>
        </>
      )}
      {route && (
        <>
          <span className="text-gray-300">›</span>
          <span className="font-bold text-gray-900">{route}</span>
        </>
      )}
    </div>
  );
}

export default async function FlightsView({
  region,
  origin,
  destination,
}: {
  region?: string;
  origin?: string;
  destination?: string;
}) {
  // ── 3단계: 노선 상세(날짜별 목록) ──
  if (region && origin && destination) {
    const deals = await getFlightRouteDeals(origin, destination);
    return (
      <div>
        <Crumb region={region} route={`${origin} → ${destination}`} />
        {deals.length === 0 ? (
          EMPTY
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500">
              날짜별 왕복 최저가 · 가격 낮은 순
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deals.map((f) => (
                <FlightCard key={f.id} flight={f} />
              ))}
            </div>
          </>
        )}
        {DISCLAIMER}
      </div>
    );
  }

  // ── 2단계: 지역 내 노선 목록 ──
  if (region) {
    const routes = await getFlightRoutes(region);
    return (
      <div>
        <Crumb region={region} />
        {routes.length === 0 ? (
          EMPTY
        ) : (
          <div className="flex flex-col gap-2">
            {routes.map((r) => (
              <Link
                key={`${r.origin}-${r.destination}`}
                href={`/?category=flight&region=${encodeURIComponent(
                  region
                )}&o=${encodeURIComponent(r.origin)}&d=${encodeURIComponent(
                  r.destination
                )}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-brand/40 hover:shadow-sm"
              >
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <span>{r.origin}</span>
                  <span className="text-brand">✈</span>
                  <span>{r.destination}</span>
                  <span className="ml-1 text-[11px] font-normal text-gray-400">
                    날짜 {r.dateCount}개
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-brand">
                    {r.minPrice != null ? formatWon(r.minPrice) : "가격 문의"}
                  </span>
                  <span className="ml-0.5 text-xs text-gray-400">부터</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {DISCLAIMER}
      </div>
    );
  }

  // ── 1단계: 지역 선택 ──
  const regions = await getFlightRegions();
  if (regions.length === 0) return <div>{EMPTY}</div>;
  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">
        지역을 선택하면 노선별 최저가와 날짜별 특가를 볼 수 있어요.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {regions.map((r) => (
          <Link
            key={r.region}
            href={`/?category=flight&region=${encodeURIComponent(r.region)}`}
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand/40 hover:shadow-md"
          >
            <span className="text-2xl">{regionEmoji(r.region)}</span>
            <span className="text-base font-extrabold text-gray-900">
              {r.region}
            </span>
            <span className="text-[11px] text-gray-400">
              노선 {r.routeCount}개
            </span>
            <span className="mt-1 text-sm">
              <span className="font-extrabold text-brand">
                {r.minPrice != null ? formatWon(r.minPrice) : "-"}
              </span>
              <span className="text-xs text-gray-400"> 부터</span>
            </span>
          </Link>
        ))}
      </div>
      {DISCLAIMER}
    </div>
  );
}
