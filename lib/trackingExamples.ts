import type { TrackedProductRow } from "./products";
import { formatWon } from "./format";

export type TrackingExample = { row: TrackedProductRow; label: string; note: string };

/**
 * Picks real tracked products that show three different readings of a price
 * history: clearly below average, close to average, and still too short.
 */
export function pickTrackingExamples(rows: TrackedProductRow[]): TrackingExample[] {
  const out: TrackingExample[] = [];
  const used = new Set<number>();
  const take = (row: TrackedProductRow | undefined, label: string, note: (r: TrackedProductRow) => string) => {
    if (!row || used.has(row.id)) return;
    used.add(row.id);
    out.push({ row, label, note: note(row) });
  };
  const longEnough = rows.filter((r) => r.trackedDays >= 14 && r.averagePrice);
  take([...longEnough].filter((r) => r.rate >= 5).sort((a, b) => b.rate - a.rate)[0], "평균보다 낮은 경우",
    (r) => `${r.trackedDays}일 기록의 평균 ${formatWon(r.averagePrice!)}보다 ${r.rate}% 낮습니다. 다만 추적 최저가 ${r.lowestPrice ? formatWon(r.lowestPrice) : "기록"}와도 비교해, 더 낮았던 적이 있는지 확인한 뒤 결정하세요.`);
  take([...longEnough].filter((r) => r.rate === 0).sort((a, b) => b.trackedDays - a.trackedDays)[0], "평균과 비슷하거나 높은 경우",
    (r) => `마지막 확인가가 평균 ${formatWon(r.averagePrice!)} 이상입니다. 판매처 할인율이 크게 보여도 이 기록으로는 평소 가격 수준이라 급하지 않다면 기다리는 편이 낫습니다.`);
  take([...rows].filter((r) => r.trackedDays < 14).sort((a, b) => b.trackedDays - a.trackedDays)[0], "기록이 아직 짧은 경우",
    (r) => `추적 ${r.trackedDays}일이라 평소 가격을 판단하기에 기록이 부족합니다. 이런 상품은 이력 기준 충족 목록에 넣지 않고 참고용으로만 보여 줍니다.`);
  return out;
}
