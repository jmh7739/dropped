import { Deal, Platform, PricePoint } from "./types";

type ScoreInput = Pick<
  Deal,
  | "platform"
  | "categorySlug"
  | "discountVsAvg"
  | "discountVsList"
  | "isLowestEver"
  | "likeCount"
  | "clickCount"
  | "baselinePrice"
  | "currentPrice"
  | "trackedDays"
  | "checkedAt"
  | "avg30Price"
>;

export type DropScoreResult = {
  score: number | null;
  label: string;
  tone: "hot" | "good" | "ok" | "wait" | "weak";
};

export type TrackingStage = {
  icon: string;
  label: string;
  className: string;
};

/** 추적 기간에 따라 사이트 전체에서 동일하게 쓰는 데이터 성숙도 표시. */
export function trackingStage(trackedDays?: number | null): TrackingStage {
  const days = Math.max(0, trackedDays ?? 0);
  if (days < 7)
    return { icon: "🔵", label: "신규 추적", className: "border-blue-200 bg-blue-50 text-blue-700" };
  if (days < 30)
    return { icon: "🟡", label: "가격 데이터 축적 중", className: "border-amber-200 bg-amber-50 text-amber-700" };
  if (days < 90)
    return { icon: "🟢", label: "30일 가격판정 가능", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  return { icon: "🏆", label: "90일 가격판정 가능", className: "border-yellow-300 bg-yellow-50 text-yellow-800" };
}

export function averagePeriodLabel(trackedDays?: number | null): string {
  const days = Math.max(1, trackedDays ?? 1);
  return days >= 30 ? "30일 평균" : `추적 ${days}일 평균`;
}

export function lowestPeriodLabel(trackedDays?: number | null): string {
  const days = Math.max(1, trackedDays ?? 1);
  if (days >= 90) return "90일 최저가";
  return `추적 ${days}일 최저가`;
}

/** 홈의 '검증된 베스트딜' 최소 게이트. 정가 할인만 있는 큐레이션은 통과하지 않는다. */
export function isVerifiedBestDeal(d: Deal): boolean {
  const score = dropScore(d).score ?? 0;
  return !d.isCurated && (d.trackedDays ?? 0) >= 10 && score >= 50 && headlineDropRate(d) >= 5;
}

const TRUSTED_PLATFORM_BONUS: Record<Platform, number> = {
  coupang: 8,
  cps: 7,
  naver: 6,
  aliexpress: 2,
};

export function headlineDropRate(d: {
  discountVsAvg: number | null;
  discountVsList: number;
  avg30Price?: number | null;
  currentPrice?: number;
}): number {
  if (d.avg30Price && d.currentPrice && d.avg30Price > d.currentPrice) {
    return Math.round(((d.avg30Price - d.currentPrice) / d.avg30Price) * 100);
  }
  return Math.max(0, d.discountVsAvg ?? d.discountVsList ?? 0);
}

export function dropBasis(d: {
  discountVsAvg: number | null;
  avg30Price?: number | null;
  currentPrice?: number;
}): "average" | "list" {
  if (d.avg30Price && d.currentPrice && d.avg30Price > d.currentPrice) return "average";
  return d.discountVsAvg !== null && d.discountVsAvg > 0 ? "average" : "list";
}

export function isHealthDeal(d: Pick<Deal, "categorySlug" | "title">): boolean {
  if (d.categorySlug === "health") return true;
  return /비타민|보충제|영양제|콜라겐|프로틴|오메가|유산균|간\s*해독|지방\s*연소|다이어트/i.test(
    d.title
  );
}

export function reliabilityLabel(d: {
  discountVsAvg: number | null;
  checkedAt?: string | null;
  trackedDays?: number | null;
  historyPointCount?: number | null;
}): string {
  if (d.discountVsAvg === null || d.discountVsAvg <= 0) return "데이터 부족";
  if (d.trackedDays) return `가격 추적 ${d.trackedDays}일`;
  if (d.historyPointCount) return `${d.historyPointCount}회 가격 확인`;
  return d.checkedAt ? "가격 확인됨" : "평균가 기준";
}

export function dropScore(d: ScoreInput): DropScoreResult {
  const hasAvg =
    (d.avg30Price != null && d.currentPrice > 0 && d.avg30Price > d.currentPrice) ||
    (d.discountVsAvg !== null && d.discountVsAvg > 0);
  if (!hasAvg && !d.baselinePrice) {
    return { score: null, label: "데이터 부족", tone: "weak" };
  }

  const rate = headlineDropRate(d);
  const days = d.trackedDays ?? 0;
  const dropComponent = Math.min(52, rate * 1.7);
  const trustComponent = TRUSTED_PLATFORM_BONUS[d.platform] ?? 4;
  const popularityComponent = Math.min(
    18,
    Math.log1p(d.clickCount) * 3 + Math.log1p(d.likeCount) * 4
  );
  const lowestComponent = d.isLowestEver
    ? days >= 30 ? 14 : days >= 14 ? 7 : 3
    : 0;
  const priceSanityComponent = d.currentPrice >= 1000 ? 8 : 3;
  const healthPenalty = d.categorySlug === "health" ? 10 : 0;
  const confidencePenalty =
    days >= 30 ? 0 : days >= 14 ? 5 : days >= 7 ? 12 : 20;
  const staleHours = d.checkedAt
    ? (Date.now() - new Date(d.checkedAt).getTime()) / 3600000
    : 48;
  const stalePenalty = staleHours > 24 ? Math.min(15, Math.round((staleHours - 24) / 6)) : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        dropComponent +
          trustComponent +
          popularityComponent +
          lowestComponent +
          priceSanityComponent -
          healthPenalty -
          confidencePenalty -
          stalePenalty
      )
    )
  );

  if (days < 7) return { score, label: "데이터 수집 중", tone: "weak" };
  if (score >= 90) return { score, label: "매우 좋은 가격", tone: "hot" };
  if (score >= 75) return { score, label: "지금 사기 좋음", tone: "good" };
  if (score >= 50) return { score, label: "괜찮은 가격", tone: "ok" };
  if (score >= 25) return { score, label: "조금 더 지켜보기", tone: "wait" };
  return { score, label: "기다리기", tone: "wait" };
}

export function dataConfidence(d: Pick<Deal, "trackedDays" | "checkedAt" | "platform">): number {
  const days = d.trackedDays ?? 0;
  let score = 0;
  if (days >= 30) score += 50;
  else if (days >= 14) score += 35;
  else if (days >= 7) score += 15 + Math.min(20, (days - 7) * 3);
  else score += days * 2;

  if (d.checkedAt) {
    const hours = (Date.now() - new Date(d.checkedAt).getTime()) / 3600000;
    if (hours <= 6) score += 30;
    else if (hours <= 24) score += 22;
    else if (hours <= 48) score += 12;
    else score += 5;
  }

  const trust: Record<string, number> = { coupang: 20, cps: 18, naver: 16, aliexpress: 10 };
  score += trust[d.platform] ?? 12;
  return Math.min(100, score);
}

export function hotDealScore(d: ScoreInput): number {
  const score = dropScore(d).score ?? 0;
  const rate = headlineDropRate(d);
  const trusted = TRUSTED_PLATFORM_BONUS[d.platform] ?? 4;
  const engagement = Math.min(30, d.clickCount * 1.5 + d.likeCount * 4);
  const healthPenalty = d.categorySlug === "health" ? 30 : 0;
  const base = score * 1.6 + rate * 2.2 + trusted + engagement - healthPenalty;
  const days = d.trackedDays ?? 0;
  const confMultiplier =
    days >= 30 ? 1.15 : days >= 14 ? 1.05 : days >= 10 ? 1.0 : days >= 7 ? 0.9 : 0.6;
  return base * confMultiplier;
}

export function limitHealthDeals<T extends Pick<Deal, "categorySlug" | "title">>(
  deals: T[],
  maxHealth = 1
): T[] {
  let health = 0;
  return deals.filter((deal) => {
    if (!isHealthDeal(deal)) return true;
    health += 1;
    return health <= maxHealth;
  });
}

export function historyWindowStats(history: PricePoint[], current: number) {
  if (!history.length) return null;
  const newest = Math.max(...history.map((h) => new Date(h.collectedAt).getTime()));
  const inWindow = (days: number) =>
    history
      .filter((h) => newest - new Date(h.collectedAt).getTime() <= days * 86400000)
      .map((h) => h.price);
  const values = history.map((h) => h.price);
  const sorted = [...values, current].sort((a, b) => a - b);
  const rank = sorted.filter((v) => v <= current).length;
  const percentile = Math.round((rank / sorted.length) * 100);
  const p90 = inWindow(90);
  return {
    min90: p90.length ? Math.min(...p90) : null,
    max90: p90.length ? Math.max(...p90) : null,
    percentile,
  };
}
