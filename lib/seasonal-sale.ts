import { getCuratedDeals, getDeals } from "./deals";
import type { Deal } from "./types";
const LIMIT = 24;

const is11st = (deal: Deal) => /^(11st|11번가)$/i.test((deal.mallName ?? "").trim());
const isAli = (deal: Deal) => deal.platform === "aliexpress";

export async function loadSaleDeals() {
  const [tracked, curated] = await Promise.all([
    getDeals({ sort: "discount" }).catch(() => [] as Deal[]),
    getCuratedDeals("discount").catch(() => [] as Deal[]),
  ]);
  const seen = new Set<number>();
  const all = [...tracked, ...curated].filter((deal) => deal.status !== "ended" && !seen.has(deal.id) && seen.add(deal.id));
  return {
    elevenst: all.filter(is11st).slice(0, LIMIT),
    ali: all.filter(isAli).slice(0, LIMIT),
  };
}

