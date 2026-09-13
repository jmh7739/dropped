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

// 2026-09-14 실데이터를 확인해 고른 서로 다른 상품. 값은 저장하지 않고 매 요청 시
// 실제 price_history를 다시 읽는다. 조건에 미달하면 사례에서 자동으로 제외한다.
const REVIEWED_PRODUCT_IDS = [13208, 7278, 14635, 11589, 14606, 13211];
const MAX_AGE_MS = 24 * 3600 * 1000;

export const getPriceInsights = cache(async (): Promise<PriceInsight[]> => {
  const deals = await getDeals();
  const byId = new Map(deals.map((deal) => [deal.productId, deal]));
  const eligibleIds = REVIEWED_PRODUCT_IDS.filter((id) => {
    const deal = byId.get(id);
    const checkedAt = deal?.checkedAt ? new Date(deal.checkedAt).getTime() : 0;
    return Boolean(deal && deal.status === "active" && !deal.isPriceError &&
      (deal.trackedDays ?? 0) >= 14 && (deal.historyPointCount ?? 0) >= 20 &&
      checkedAt > 0 && Date.now() - checkedAt <= MAX_AGE_MS);
  });

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
