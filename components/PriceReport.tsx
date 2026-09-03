import { formatWon } from "@/lib/format";
import type { DropScoreResult } from "@/lib/dropMetrics";
import { PriceStats, Verdict } from "@/lib/priceReport";

/** 가격 리포트: 최종 판정 배너 + 가격 분석표 + 신뢰도. */
export default function PriceReport({
  stats,
  verdict,
  listPrice,
  dropScore,
}: {
  stats: PriceStats;
  verdict: Verdict;
  listPrice: number;
  dropScore?: DropScoreResult;
}) {
  const rows: { label: string; value: number | null; hi?: boolean }[] = [
    { label: "현재가", value: stats.current, hi: true },
    { label: "7일 평균", value: stats.avg7 },
    { label: "30일 평균", value: stats.avg30 },
    { label: "90일 평균", value: stats.avg90 },
    { label: "30일 최저", value: stats.min30 },
    { label: "90일 최저", value: stats.min90 },
    { label: "90일 최고", value: stats.max90 },
    { label: stats.lowestLabel, value: stats.minAll },
  ];
  if (listPrice > 0) rows.push({ label: "정가/원가", value: listPrice });

  return (
    <div className="flex flex-col gap-4">
      {/* 최종 판정 */}
      <div className={`rounded-xl border p-4 ${verdict.cls}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-extrabold">
              <span>{verdict.icon}</span>
              <span>{verdict.title}</span>
            </div>
            <p className="mt-0.5 text-sm font-medium opacity-90">{verdict.reason}</p>
          </div>
          {dropScore && (
            <div className="rounded-lg bg-white/70 px-3 py-2 text-right">
              <div className="text-xs font-bold opacity-70">DROP SCORE</div>
              <div className="text-2xl font-extrabold leading-none">
                {dropScore.score !== null ? dropScore.score : "-"}
              </div>
              <div className="mt-1 text-xs font-semibold opacity-80">
                {dropScore.label}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 가격 분석표 */}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.label}
                className={`border-b border-gray-100 last:border-0 ${
                  r.hi ? "bg-brand/5" : ""
                }`}
              >
                <td className="px-4 py-2.5 text-gray-500">{r.label}</td>
                <td
                  className={`px-4 py-2.5 text-right font-bold tabular-nums ${
                    r.hi ? "text-brand" : "text-gray-900"
                  }`}
                >
                  {r.value != null ? formatWon(r.value) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400">
        📊 가격 추적 {stats.trackedDays}일 · {stats.points}회 수집 기준.
        {stats.avg90 && ` 현재 가격은 추적 이력 중 하위 ${stats.percentile}% 구간입니다.`}
        {!stats.enoughData &&
          " 아직 이력이 짧아 판정 신뢰도가 낮을 수 있어요."}
      </p>
    </div>
  );
}
