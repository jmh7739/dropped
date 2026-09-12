import { formatWon } from "@/lib/format";
import type { DropScoreResult } from "@/lib/dropMetrics";
import { averagePeriodLabel, lowestPeriodLabel, trackingStage } from "@/lib/dropMetrics";
import { PriceStats, Verdict } from "@/lib/priceReport";
import { timeAgo } from "@/lib/format";

/** 가격 리포트: 최종 판정 배너 + 가격 분석표 + 신뢰도. */
export default function PriceReport({
  stats,
  verdict,
  listPrice,
  dropScore,
  lastCheckedAt,
}: {
  stats: PriceStats;
  verdict: Verdict;
  listPrice: number;
  dropScore?: DropScoreResult;
  lastCheckedAt?: string | null;
}) {
  const d = stats.trackedDays;
  const stage = trackingStage(d);
  const confidence = d >= 90 && stats.points >= 60 ? 90 : d >= 30 && stats.points >= 30 ? 78 : d >= 7 && stats.points >= 10 ? 48 : 20;
  const confidenceLabel = confidence >= 75 ? "높음" : confidence >= 40 ? "보통" : "낮음";
  const rows: { label: string; value: number | null; hi?: boolean }[] = [
    { label: "현재가", value: stats.current, hi: true },
    { label: averagePeriodLabel(d), value: stats.avg30 },
    { label: lowestPeriodLabel(d), value: d >= 90 ? stats.min90 : stats.minAll },
    ...(d >= 90 ? [{ label: "90일 평균", value: stats.avg90 }] : []),
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

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-gray-900">가격판정 신뢰도</div>
            <div className="mt-0.5 text-xs text-gray-500">{stage.icon} {stage.label}</div>
          </div>
          <span className="text-sm font-extrabold text-gray-700">{confidenceLabel}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${confidence}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>추적 {d}일</span>
          <span>가격 수집 {stats.points}회</span>
          {lastCheckedAt && <span suppressHydrationWarning>최근 확인 {timeAgo(lastCheckedAt)}</span>}
        </div>
        {!stats.enoughData && <p className="mt-2 text-xs font-medium text-amber-700">아직 충분한 가격 이력이 없어 구매 판정은 참고용입니다.</p>}
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
        {stats.avg30 && ` 현재 가격은 추적 이력 중 하위 ${stats.percentile}% 구간입니다.`}
        {!stats.enoughData &&
          " 아직 이력이 짧아 판정 신뢰도가 낮을 수 있어요."}
      </p>
    </div>
  );
}
