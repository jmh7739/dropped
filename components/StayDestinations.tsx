import { stayRegionsWithUrls } from "@/lib/destinations";

/**
 * 여행지별 숙소 카드 — 누르면 그 도시 실제 호텔·요금(아고다 도시 랜딩)으로.
 *   Hotellook 폐쇄로 '실시간 가격 딜'은 불가 → '여행지별 실검색'으로 정직하게 연결.
 */
export default function StayDestinations() {
  const regions = stayRegionsWithUrls();
  return (
    <div className="flex flex-col gap-5">
      {regions.map((r) => (
        <div key={r.region}>
          <p className="mb-2 text-sm font-bold text-gray-700">{r.region}</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {r.cities.map((c) => (
              <a
                key={c.name}
                href={c.href}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-3 transition hover:border-brand/40 hover:shadow-md"
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-gray-900">
                    {c.name}
                  </span>
                  <span className="text-[11px] font-bold text-brand">
                    호텔 보기 →
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
