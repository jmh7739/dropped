import Link from "next/link";
import { stayRegionsWithUrls } from "@/lib/destinations";

// 지역 대표 이모지 (국기 이모지는 Windows서 깨져 회피)
const REGION_EMOJI: Record<string, string> = {
  일본: "🗾",
  동남아: "🌴",
  중화권: "🏮",
  국내: "🏠",
  유럽: "🏰",
  "미주·기타": "🏝️",
};

/**
 * 여행지별 숙소 — 항공권처럼 지역 → 도시 드릴다운.
 *   region 없으면 지역 카드, 있으면 그 지역 도시 카드(아고다 실검색 딥링크).
 */
export default function StayDestinations({ region }: { region?: string }) {
  const regions = stayRegionsWithUrls();

  // ── 1단계: 지역 선택 ──
  if (!region) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {regions.map((r) => (
          <Link
            key={r.region}
            href={`/?category=flight&tt=stay&region=${encodeURIComponent(r.region)}`}
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand/40 hover:shadow-md"
          >
            <span className="text-2xl">{REGION_EMOJI[r.region] ?? "🏨"}</span>
            <span className="text-base font-extrabold text-gray-900">
              {r.region}
            </span>
            <span className="text-[11px] text-gray-400">
              도시 {r.cities.length}곳
            </span>
          </Link>
        ))}
      </div>
    );
  }

  // ── 2단계: 지역 내 도시 ──
  const cur = regions.find((r) => r.region === region);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        <Link
          href="/?category=flight&tt=stay"
          className="font-medium hover:text-brand"
        >
          🏨 전체 지역
        </Link>
        <span className="text-gray-300">›</span>
        <span className="font-bold text-gray-900">
          {REGION_EMOJI[region] ?? ""} {region}
        </span>
      </div>

      {!cur || cur.cities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-400">
          이 지역은 준비 중이에요.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {cur.cities.map((c) => (
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
      )}
    </div>
  );
}
