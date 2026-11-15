import type { Deal } from "./types";
import { formatWon } from "./format";

export type GuideCase = { productId: number; title: string; mall: string; label: string; body: string; checkedAt: string | null };
export type GuideCases = { summary: string[]; cases: GuideCase[]; total: number };

const mallOf = (d: Deal) => d.mallName || (d.platform === "aliexpress" ? "알리익스프레스" : d.platform === "cps" ? "국내몰" : d.platform);

/** 판매처가 적은 할인율은 크지만 Dropped 기록상 평균보다 싸지 않은 상품. */
export const isListPriceTrap = (d: Deal) =>
  d.discountVsList >= 30 && d.avg30Price != null && d.avg30Price > 0 && d.currentPrice >= d.avg30Price && (d.trackedDays ?? 0) >= 14;
/** 기록이 짧아 평균·최저가 판단을 보류해야 하는 상품. */
export const isShortHistory = (d: Deal) => (d.trackedDays ?? 0) < 14 || (d.historyPointCount ?? 0) < 20;
/** 마지막 확인 후 48시간이 지난 가격. */
export const isStale = (d: Deal, now: number) => !d.checkedAt || now - Date.parse(d.checkedAt) > 48 * 3600_000;
/** 추적 기간 최저가지만 그 기간이 30일 미만인 상품. */
export const isShortLowest = (d: Deal) => d.isLowestEver && (d.trackedDays ?? 0) < 30;

const TOPICS: Record<string, ("trap" | "short" | "stale" | "lowest")[]> = {
  "price-drop-failures": ["trap", "short", "stale", "lowest"],
  "list-price-trap": ["trap"],
  "list-vs-average": ["trap"],
  "short-history": ["short", "lowest"],
  "domestic-price-observation": ["short"],
  "true-lowest-price": ["lowest", "short"],
  "price-collection-gap": ["stale"],
  "price-history-gaps": ["stale"],
  "price-drop-buy-or-wait": ["trap", "lowest"],
  "drop-score": ["trap", "short"],
};

/**
 * 가이드 본문 아래에 붙이는 실제 기록 사례. 모든 수치는 현재 공개 중인 딜 기록에서 계산하며,
 * 사례가 없으면 비워 둔다(지어내지 않는다).
 */
export function guideCases(slug: string, deals: Deal[], now = Date.now()): GuideCases | null {
  const topics = TOPICS[slug];
  if (!topics) return null;
  const active = deals.filter((d) => d.status === "active" && !d.isPriceError && d.currentPrice > 0);
  if (!active.length) return { summary: [], cases: [], total: 0 };
  const traps = active.filter(isListPriceTrap);
  const short = active.filter(isShortHistory);
  const stale = active.filter((d) => isStale(d, now));
  const lowest = active.filter(isShortLowest);
  const summary: string[] = [];
  const cases: GuideCase[] = [];
  const used = new Set<number>();
  const add = (d: Deal | undefined, label: string, body: string) => {
    if (!d || used.has(d.productId)) return;
    used.add(d.productId);
    cases.push({ productId: d.productId, title: d.title, mall: mallOf(d), label, body, checkedAt: d.checkedAt });
  };
  const pct = (n: number) => `${Math.round((n / active.length) * 100)}%`;
  for (const t of topics) {
    if (t === "trap") {
      summary.push(`지금 공개 중인 딜 ${active.length}개 가운데 판매처 표시 할인율이 30% 이상인데도 Dropped 기록의 30일 평균보다 싸지 않은 상품이 ${traps.length}개(${pct(traps.length)})입니다.`);
      const d = [...traps].sort((a, b) => b.discountVsList - a.discountVsList)[0];
      if (d) add(d, "표시 할인율과 실제 기록이 다른 경우", `판매처는 정가 ${formatWon(d.listPrice)} 대비 ${d.discountVsList}% 할인이라고 표시하지만, 마지막 확인가 ${formatWon(d.currentPrice)}은 ${d.trackedDays}일 기록의 평균 ${formatWon(d.avg30Price!)}과 같거나 더 높습니다. 정가가 실제 판매가로 쓰인 적이 드물다는 뜻입니다.`);
    }
    if (t === "short") {
      summary.push(`추적 14일 또는 가격 기록 20회에 못 미치는 상품은 ${short.length}개(${pct(short.length)})로, 이 상품들은 이력 기준 충족 목록에 넣지 않습니다.`);
      const d = [...short].filter((x) => (x.discountVsAvg ?? 0) >= 15).sort((a, b) => (b.discountVsAvg ?? 0) - (a.discountVsAvg ?? 0))[0] ?? short[0];
      if (d) add(d, "기록이 짧아 판단을 보류한 경우", `추적 ${d.trackedDays ?? 0}일·기록 ${d.historyPointCount ?? 0}회뿐입니다.${d.discountVsAvg ? ` 계산상 평균보다 ${d.discountVsAvg}% 낮지만, 처음 며칠의 높은 가격이 평균을 끌어올렸을 수 있습니다.` : ""} 기록이 더 쌓일 때까지 강한 판정을 하지 않습니다.`);
    }
    if (t === "stale") {
      summary.push(`마지막 확인 후 48시간이 지난 가격은 ${stale.length}개(${pct(stale.length)})입니다. 이런 상품은 '가격 재확인 필요'로 표시하고 구매 판정을 내리지 않습니다.`);
      const d = stale[0];
      if (d) add(d, "마지막 확인이 오래된 경우", `마지막 확인가는 ${formatWon(d.currentPrice)}이지만 확인한 지 48시간이 지났습니다. 그 사이 가격이 바뀌거나 품절됐을 수 있어, 판매 페이지에서 다시 확인해야 합니다.`);
    }
    if (t === "lowest") {
      summary.push(`'추적 최저가'로 표시된 상품 중 추적 기간이 30일 미만인 경우는 ${lowest.length}개입니다. 최저가라는 표현에는 항상 기간을 붙여 읽어야 합니다.`);
      const d = lowest[0];
      if (d) add(d, "짧은 기간의 최저가", `${formatWon(d.currentPrice)}이 추적 ${d.trackedDays ?? 0}일 동안의 최저가입니다. 한 달이 안 되는 기록이라, 더 긴 기간에서도 낮은 가격인지는 아직 알 수 없습니다.`);
    }
  }
  return { summary, cases, total: active.length };
}
