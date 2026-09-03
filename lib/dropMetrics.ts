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
>;

export type DropScoreResult = {
  score: number | null;
  label: string;
  tone: "hot" | "good" | "ok" | "wait" | "weak";
};

const TRUSTED_PLATFORM_BONUS: Record<Platform, number> = {
  coupang: 8,
  cps: 7,
  naver: 6,
  aliexpress: 2,
};

export function headlineDropRate(d: {
  discountVsAvg: number | null;
  discountVsList: number;
}): number {
  return Math.max(0, d.discountVsAvg ?? d.discountVsList ?? 0);
}

export function dropBasis(d: {
  discountVsAvg: number | null;
}): "average" | "list" {
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
  if (d.discountVsAvg === null || d.discountVsAvg <= 0 || !d.baselinePrice) {
    return { score: null, label: "데이터 부족", tone: "weak" };
  }

  const rate = headlineDropRate(d);
  const dropComponent = Math.min(52, rate * 1.7);
  const trustComponent = TRUSTED_PLATFORM_BONUS[d.platform] ?? 4;
  const popularityComponent = Math.min(
    18,
    Math.log1p(d.clickCount) * 3 + Math.log1p(d.likeCount) * 4
  );
  const lowestComponent = d.isLowestEver ? 14 : 0;
  const priceSanityComponent = d.currentPrice >= 1000 ? 8 : 3;
  const healthPenalty = d.categorySlug === "health" ? 10 : 0;
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
          healthPenalty
      )
    )
  );

  if (score >= 90) return { score, label: "역대급 가격", tone: "hot" };
  if (score >= 75) return { score, label: "지금 사기 좋음", tone: "good" };
  if (score >= 50) return { score, label: "괜찮은 가격", tone: "ok" };
  if (score >= 25) return { score, label: "조금 더 지켜보기", tone: "wait" };
  return { score, label: "기다리기", tone: "wait" };
}

export function hotDealScore(d: ScoreInput): number {
  const score = dropScore(d).score ?? 0;
  const rate = headlineDropRate(d);
  const trusted = TRUSTED_PLATFORM_BONUS[d.platform] ?? 4;
  const engagement = Math.min(30, d.clickCount * 1.5 + d.likeCount * 4);
  const healthPenalty = d.categorySlug === "health" ? 30 : 0;
  return score * 1.6 + rate * 2.2 + trusted + engagement - healthPenalty;
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
