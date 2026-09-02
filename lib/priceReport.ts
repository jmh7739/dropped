import { PricePoint } from "./types";

/**
 * 가격 리포트 — "그래서 지금 사? 기다려?"에 답하기 위한 통계 + 최종 판정.
 * 상품 이력(price_history)에서 7일/30일 평균·최저, 역대 최저, 추적기간을 계산한다.
 */
export type PriceStats = {
  current: number;
  avg7: number | null;
  avg30: number | null;
  min30: number | null;
  minAll: number;
  points: number;
  trackedDays: number;
  isLowest: boolean; // 현재가가 추적기간 내 최저
  /** '역대 최저'는 충분히 오래 추적(≥60일)했을 때만. 아니면 '최근 N일 최저'. */
  lowestLabel: string;
  enoughData: boolean; // 판정을 신뢰할 만큼 이력이 쌓였나
};

export function priceStats(
  history: PricePoint[],
  current: number
): PriceStats | null {
  if (!history.length) return null;
  const now = Date.now();
  const pts = history.map((h) => ({
    p: h.price,
    t: new Date(h.collectedAt).getTime(),
  }));
  const prices = pts.map((x) => x.p);
  const within = (d: number) =>
    pts.filter((x) => now - x.t <= d * 86400000).map((x) => x.p);
  const avg = (a: number[]) =>
    a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null;

  const p30 = within(30);
  const minAll = Math.min(...prices, current);
  const trackedDays = Math.max(
    1,
    Math.round((now - Math.min(...pts.map((x) => x.t))) / 86400000)
  );

  return {
    current,
    avg7: avg(within(7)),
    avg30: avg(p30),
    min30: p30.length ? Math.min(...p30) : null,
    minAll,
    points: prices.length,
    trackedDays,
    isLowest: current <= minAll,
    lowestLabel: trackedDays >= 60 ? "역대 최저가" : `최근 ${trackedDays}일 최저가`,
    enoughData: prices.length >= 6 && trackedDays >= 1,
  };
}

export type VerdictTier = "buy" | "ok" | "wait";
export type Verdict = {
  tier: VerdictTier;
  icon: string;
  title: string;
  reason: string;
  cls: string; // 배너 색
};

/**
 * 최종 판정. rate = 대표 하락률(급락딜=평균대비, 국내몰=원가대비).
 *   충분한 데이터가 있고 현재가가 최저면 🟢, 아니면 하락폭으로 🟢/🟡/🔴.
 */
export function buyVerdict(
  rate: number,
  isLowest: boolean,
  lowestLabel: string,
  enoughData: boolean
): Verdict {
  const d = Math.round(rate);
  const BUY = "border-emerald-300 bg-emerald-50 text-emerald-900";
  const OK = "border-amber-300 bg-amber-50 text-amber-900";
  const WAIT = "border-rose-300 bg-rose-50 text-rose-900";

  if (isLowest && enoughData && rate >= 4)
    return {
      tier: "buy",
      icon: "🟢",
      title: "지금 사도 좋은 가격",
      reason: `${lowestLabel} · 평균보다 ${d}% 저렴`,
      cls: BUY,
    };
  if (rate >= 15)
    return {
      tier: "buy",
      icon: "🟢",
      title: "지금 사도 좋은 가격",
      reason: `평균보다 ${d}% 저렴`,
      cls: BUY,
    };
  if (rate >= 6)
    return {
      tier: "ok",
      icon: "🟡",
      title: "괜찮은 가격",
      reason: `평균보다 ${d}% 저렴`,
      cls: OK,
    };
  return {
    tier: "wait",
    icon: "🔴",
    title: "기다리는 게 좋아요",
    reason:
      rate > 0 ? `평균보다 ${d}%로 큰 차이 없음` : "지금은 싸지 않은 편",
    cls: WAIT,
  };
}

/**
 * 베스트딜(국내몰 인기) 판정 — 이 상품은 '평소 시세 추적'이 아니라 제휴사 표기
 *   할인(정가/원가 대비)이라, '평균보다'라고 하면 거짓이 된다. 정직하게 표기.
 */
export function curatedVerdict(listDiscount: number): Verdict {
  const d = Math.round(listDiscount);
  const OK = "border-amber-300 bg-amber-50 text-amber-900";
  return {
    tier: "ok",
    icon: "🛒",
    title: "베스트딜 · 인기 세일",
    reason:
      d >= 1
        ? `정가/원가 대비 ${d}% 할인 · 평소 시세는 추적 중`
        : "국내몰에서 지금 잘 팔리는 상품",
    cls: OK,
  };
}
