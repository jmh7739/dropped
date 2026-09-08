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
 * 대표 하락률: 실제 가격 이력(avg30Price) 우선, 없으면 DB 평균 대비, 최후 정가 대비.
 */
export function headlineDiscount(d: {
  discountVsAvg: number | null;
  discountVsList: number;
  avg30Price?: number | null;
  currentPrice?: number;
}): { rate: number; basis: "평균" | "정가" } {
  if (d.avg30Price && d.currentPrice && d.avg30Price > d.currentPrice) {
    return {
      rate: Math.round(((d.avg30Price - d.currentPrice) / d.avg30Price) * 100),
      basis: "평균",
    };
  }
  if (d.discountVsAvg !== null && d.discountVsAvg > 0) {
    return { rate: Math.round(d.discountVsAvg), basis: "평균" };
  }
  return { rate: Math.round(d.discountVsList), basis: "정가" };
}

/**
 * Deal 상태: 숫자 대신 한눈에 읽히는 상태로. (가격이력 대비 기준)
 *   🏆 최저가 / 🔥 급락 / 🟢 좋은 가격 / 📉 소폭 하락
 *   trackedDays가 짧으면 "90일 최저가"라고 단정하지 않는다.
 */
export function dealStatus(
  rate: number,
  isLowestEver: boolean,
  trackedDays?: number | null,
  basis?: "평균" | "정가"
): { label: string; cls: string } {
  const tag = basis === "정가" ? "정가 대비" : "평소 대비";
  if (rate >= 25)
    return { label: `🔥 ${tag} -${Math.round(rate)}%`, cls: "bg-red-600 text-white" };
  if (isLowestEver && rate >= 12) {
    const days = trackedDays ?? 0;
    const label =
      days >= 60 ? "🏆 역대 최저가" : days >= 14 ? "🏆 추적 최저가" : "🏆 최근 최저";
    return { label, cls: "bg-amber-400 text-amber-950" };
  }
  if (rate >= 8)
    return { label: `🟢 ${tag} -${Math.round(rate)}%`, cls: "bg-emerald-600 text-white" };
  return { label: `📉 ${tag} -${Math.round(rate)}%`, cls: "bg-sky-500 text-white" };
}

const TITLE_NOISE =
  /(?:무료\s*배송|해외\s*직구|국내\s*발송|당일\s*배송|사은품\s*증정|즉시\s*발송|빠른\s*배송)/gi;

export function displayTitle(raw: string, maxLen = 60): string {
  let t = raw
    .replace(TITLE_NOISE, "")
    .replace(/\([^)]{0,30}\)/g, " ")
    .replace(/\[[^\]]{0,30}\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (t.length > maxLen) {
    t = t.substring(0, maxLen - 1).replace(/\s+\S*$/, "") + "…";
  }
  return t || raw.substring(0, maxLen);
}
