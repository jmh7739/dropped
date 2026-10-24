export function compareObservedAverage(current: number, average: number): { text: string; direction: 'lower' | 'equal' | 'higher' | 'unknown' } {
  if (!Number.isFinite(current) || !Number.isFinite(average) || current <= 0 || average <= 0) return { text: '비교 자료 없음', direction: 'unknown' };
  if (current === average) return { text: '평균과 같음', direction: 'equal' };
  const gap = Math.abs((current - average) / average * 100);
  const amount = gap < 0.1 ? '0.1% 미만' : `${gap.toFixed(1)}%`;
  return { text: `${amount} ${current < average ? '낮음' : '높음'}`, direction: current < average ? 'lower' : 'higher' };
}
