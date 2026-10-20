/** Price observations are grouped by Korean date, on both server and browser. */
export function priceChartDate(value: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return '날짜 확인 필요';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'short', day: 'numeric',
  }).format(time);
}
