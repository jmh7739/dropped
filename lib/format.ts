// 서버(Node ICU)와 브라우저의 toLocaleString 차이로 하이드레이션 불일치가 나서
//   결정적(deterministic) 천단위 구분으로 대체한다.
export function groupThousands(v: number): string {
  const n = Math.round(v);
  const sign = n < 0 ? "-" : "";
  return sign + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatWon(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return groupThousands(v) + "원";
}

export function formatPercent(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return `${Math.round(v)}%`;
}

/** "3시간 전", "2일 전" 같은 상대 시간 */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

/**
 * 크롤링해온 URL은 신뢰할 수 없으므로 http(s)만 허용.
 * javascript:, data:, vbscript: 등 스킴 주입을 차단한다.
 */
export function safeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "#";
}

/**
 * 대표 하락률: 평균 대비가 있으면 그것을, 없으면 정가 대비를 사용.
 * (이력이 쌓이면 자동으로 "평균 대비"로 승격)
 */
export function headlineDiscount(d: {
  discountVsAvg: number | null;
  discountVsList: number;
}): { rate: number; basis: "최근 평균" | "정가" } {
  if (d.discountVsAvg !== null && d.discountVsAvg > 0) {
    return { rate: d.discountVsAvg, basis: "최근 평균" };
  }
  return { rate: d.discountVsList, basis: "정가" };
}

/**
 * Deal 상태: 숫자 대신 한눈에 읽히는 상태로. (가격이력 대비 기준)
 *   🏆 90일 최저가 / 🔥 급락 / 🟢 좋은 가격 / 📉 소폭 하락
 */
export function dealStatus(
  rate: number,
  isLowestEver: boolean
): { label: string; cls: string } {
  if (rate >= 25)
    return { label: `🔥 급락 ${Math.round(rate)}%`, cls: "bg-red-600 text-white" };
  if (isLowestEver && rate >= 12)
    return { label: "🏆 90일 최저가", cls: "bg-amber-400 text-amber-950" };
  if (rate >= 8)
    return { label: `🟢 좋은 가격 ${Math.round(rate)}%`, cls: "bg-emerald-600 text-white" };
  return { label: `📉 ${Math.round(rate)}% 하락`, cls: "bg-sky-500 text-white" };
}
