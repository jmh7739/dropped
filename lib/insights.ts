import { cache } from "react";
import { getDeals } from "./deals";
import { getProductReport, ProductReport } from "./products";
import { priceStats, PriceStats } from "./priceReport";

export type PriceInsight = {
  product: ProductReport;
  stats: PriceStats;
  firstPrice: number;
  averageGapPercent: number;
};

const MAX_AGE_MS = 24 * 3600 * 1000;

export const getPriceInsights = cache(async (): Promise<PriceInsight[]> => {
  const deals = await getDeals();
  // 고정 ID 목록은 실제 검증 상품이 바뀌면 사례 페이지를 비워 버린다.
  // 현재 공개 중인 딜에서 화면에 밝힌 기준을 그대로 적용해 사례를 고른다.
  const eligibleIds = deals.filter((deal) => {
    const checkedAt = deal?.checkedAt ? new Date(deal.checkedAt).getTime() : 0;
    return Boolean(deal && deal.status === "active" && !deal.isPriceError &&
      (deal.trackedDays ?? 0) >= 14 && (deal.historyPointCount ?? 0) >= 20 &&
      checkedAt > 0 && Date.now() - checkedAt <= MAX_AGE_MS);
  }).sort((a, b) => (b.historyPointCount ?? 0) - (a.historyPointCount ?? 0))
    .slice(0, 12)
    .map((deal) => deal.productId);

  const reports = await Promise.all(eligibleIds.map((id) => getProductReport(id)));
  const insights: PriceInsight[] = [];
  for (const product of reports) {
    if (!product?.hasActiveDeal || product.currentPrice == null || !product.lastCheckedAt) continue;
    const checkedAt = new Date(product.lastCheckedAt).getTime();
    if (!Number.isFinite(checkedAt) || Date.now() - checkedAt > MAX_AGE_MS) continue;
    const stats = priceStats(product.history, product.currentPrice);
    if (!stats || stats.trackedDays < 14 || stats.points < 20 || stats.avg30 == null) continue;
    const firstPrice = product.history[0]?.price;
    if (!Number.isFinite(firstPrice) || firstPrice <= 0) continue;
    insights.push({
      product,
      stats,
      firstPrice,
      averageGapPercent: Math.round(((stats.avg30 - product.currentPrice) / stats.avg30) * 100),
    });
  }
  return insights;
});
