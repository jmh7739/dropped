import { PricePoint } from "./types";

/**
 * 가격 리포트 — "그래서 지금 사? 기다려?"에 답하기 위한 통계 + 최종 판정.
 * 상품 이력(price_history)에서 기간별 평균·최저와 실제 추적기간을 계산한다.
 */
export type PriceStats = {
  current: number;
  avg7: number | null;
  avg30: number | null;
  avg90: number | null;
  min30: number | null;
  min90: number | null;
  max90: number | null;
  minAll: number;
  points: number;
  trackedDays: number;
  percentile: number;
  isLowest: boolean; // 현재가가 추적기간 내 최저
  /** 관측한 기간 내 최저: 추적 기간이 길어져도 역대 전체를 단정하지 않는다. */
  lowestLabel: string;
  enoughData: boolean; // 판정을 신뢰할 만큼 이력이 쌓였나
};

export function priceStats(
  history: PricePoint[],
  current: number
): PriceStats | null {
  if (!history.length || !Number.isFinite(current) || current <= 0) return null;
  const now = Date.now();
  const pts = history.map((h) => ({
    p: h.price,
    t: new Date(h.collectedAt).getTime(),
  })).filter(h => Number.isFinite(h.p) && h.p > 0 && Number.isFinite(h.t) && h.t <= now);
  if (!pts.length) return null;
  const prices = pts.map((x) => x.p);
  const within = (d: number) =>
    pts.filter((x) => now - x.t <= d * 86400000).map((x) => x.p);
  const avg = (a: number[]) =>
    a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null;

  const p30 = within(30);
  const p90 = within(90);
  const minAll = Math.min(...prices, current);
  const sorted = [...prices, current].sort((a, b) => a - b);
  const rank = sorted.filter((p) => p <= current).length;
  const trackedDays = Math.max(
    1,
    Math.ceil((Math.max(...pts.map(x => x.t)) - Math.min(...pts.map(x => x.t))) / 86400000)
  );

  return {
    current,
    avg7: avg(within(7)),
    avg30: avg(p30),
    avg90: avg(p90),
    min30: p30.length ? Math.min(...p30) : null,
    min90: p90.length ? Math.min(...p90) : null,
    max90: p90.length ? Math.max(...p90) : null,
    minAll,
    points: prices.length,
    trackedDays,
    percentile: Math.round((rank / sorted.length) * 100),
    isLowest: current <= minAll,
    lowestLabel: trackedDays >= 90 ? "90일 최저가" : `추적 ${trackedDays}일 최저가`,
    enoughData: prices.length >= 10 && trackedDays >= 7,
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

  if (!enoughData) {
    if (rate >= 10)
      return {
        tier: "ok",
        icon: "🟡",
        title: "가격 데이터 수집 중",
        reason: `아직 추적 기간이 짧아 정확한 판정이 어렵습니다 (${d}% 하락 감지)`,
        cls: OK,
      };
    return {
      tier: "wait",
      icon: "🔴",
      title: "데이터 수집 중",
      reason: "추적 기간이 짧아 가격 판정을 내리기 이릅니다",
      cls: WAIT,
    };
  }
  if (isLowest && rate >= 4)
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
 * Deal(홈/베스트딜 카드용) → 최종 구매 판정. 상세페이지와 '같은' buyVerdict를
 *   써서 홈 카드와 상세의 판정이 모순되지 않게 한다(단일 source of truth).
 *   카드엔 전체 이력이 없으므로 집계값(avg30/discountVsAvg/추적일/이력수)으로 계산.
 *   ⚠️ 큐레이션(정가대비) 딜은 평소가 추적이 아니라 대상 아님 → 호출부에서 제외.
 */
export function dealVerdict(d: {
  discountVsAvg: number | null;
  avg30Price: number | null;
  currentPrice: number;
  isLowestEver: boolean;
  trackedDays: number | null;
  historyPointCount: number | null;
}): Verdict {
  const days = d.trackedDays ?? 0;
  const points = d.historyPointCount ?? 0;
  const rate =
    d.avg30Price && d.avg30Price > d.currentPrice
      ? Math.round(((d.avg30Price - d.currentPrice) / d.avg30Price) * 100)
      : Math.max(0, Math.round(d.discountVsAvg ?? 0));
  const enoughData = points >= 10 && days >= 7;
  const lowestLabel =
    `추적 ${Math.max(days, 1)}일 중 최저`;
  return buyVerdict(rate, d.isLowestEver, lowestLabel, enoughData);
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
