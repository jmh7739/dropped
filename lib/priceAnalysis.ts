import type { PricePoint } from "./types";
import { dailyPricePoints, type PriceStats } from "./priceReport";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const kstDate = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(new Date(iso));

export type PriceAnalysis = {
  /** 가격 기록이 보여 주는 패턴을 설명하는 문단들. */
  paragraphs: string[];
  /** 언제 사는 편이 나은지에 대한 기록 기반 기준. 투자·수익 조언이 아닌 구매 시점 참고. */
  whenToBuy: string[];
  /** 기록상 자주 보인 가격대(하위 25%~상위 25%의 일별 대표가격). */
  band: { low: number; high: number } | null;
};

function quantile(sorted: number[], q: number) {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
}

/**
 * 한 상품의 가격 이력을 사람이 읽는 해석으로 바꾼다. 모든 숫자는 기록에서 계산하며,
 * 기록이 부족하면 결론 대신 무엇이 부족한지 말한다.
 */
export function analyzePriceHistory(history: PricePoint[], stats: PriceStats, now = Date.now()): PriceAnalysis {
  const daily = dailyPricePoints(history, now);
  const paragraphs: string[] = [];
  const whenToBuy: string[] = [];
  if (daily.length < 3) {
    paragraphs.push(`아직 서로 다른 날짜의 가격 기록이 ${daily.length}일뿐이라 평소 가격이나 변동 폭을 말하기 어렵습니다. 기록이 14일 이상 쌓이면 평균·최저가와 비교한 해석을 보여 드립니다.`);
    whenToBuy.push("급하게 필요한 상품이 아니라면 가격 기준을 저장해 두고 기록이 쌓인 뒤 다시 확인하세요.");
    return { paragraphs, whenToBuy, band: null };
  }
  const prices = daily.map((d) => d.price);
  const sorted = [...prices].sort((a, b) => a - b);
  const band = { low: quantile(sorted, 0.25), high: quantile(sorted, 0.75) };
  const max = sorted[sorted.length - 1], min = sorted[0];
  const spread = max > 0 ? Math.round(((max - min) / max) * 100) : 0;
  let changes = 0;
  for (let i = 1; i < prices.length; i++) if (prices[i] !== prices[i - 1]) changes++;
  const lowestDay = [...daily].reverse().find((d) => d.price === min)!;
  const daysSinceLowest = Math.max(0, Math.floor((now - Date.parse(lowestDay.collectedAt)) / 86400000));
  const atLowCount = prices.filter((p) => p <= min * 1.02).length;

  if (spread < 3) {
    paragraphs.push(`기록한 ${daily.length}일 동안 하루 대표가격이 ${won(min)}~${won(max)} 사이에서 거의 움직이지 않았습니다(변동 폭 ${spread}%). 가격이 고정에 가까운 상품이라, 판매처가 표시한 할인율이 커 보여도 실제로는 평소 가격일 가능성이 큽니다.`);
  } else {
    paragraphs.push(`기록한 ${daily.length}일 동안 하루 대표가격은 ${won(min)}~${won(max)} 사이에서 움직였고(최고가 대비 변동 폭 ${spread}%), 전날과 가격이 달라진 날은 ${changes}번이었습니다. 가장 자주 보인 가격대는 ${won(band.low)}~${won(band.high)}입니다.`);
  }
  const position = stats.current <= band.low
    ? "자주 보인 가격대의 아래쪽"
    : stats.current >= band.high
      ? "자주 보인 가격대의 위쪽"
      : "자주 보인 가격대 안";
  paragraphs.push(`마지막 확인가 ${won(stats.current)}은 ${position}에 있습니다. 기록 중 지금보다 낮았던 날은 ${stats.percentile}%이고, 기록상 최저가 ${won(min)}은 ${daysSinceLowest === 0 ? "오늘" : `${daysSinceLowest}일 전(${kstDate(lowestDay.collectedAt)})`} 마지막으로 나타났습니다.${atLowCount > 1 ? ` 최저가 근처(2% 이내)는 ${atLowCount}일 관측돼, 한 번뿐인 오류값은 아닌 것으로 보입니다.` : " 최저가 근처 가격은 하루만 관측돼, 일시적인 쿠폰·오류 가격이었을 수도 있습니다."}`);

  if (!stats.enoughData) {
    whenToBuy.push(`추적 ${stats.trackedDays}일, 관측일 ${stats.observedDays}일이라 판단 기준(14일·14일)에 못 미칩니다. 아래 기준은 참고만 하세요.`);
  }
  if (stats.current <= min * 1.02) {
    whenToBuy.push(`지금 가격이 기록상 최저가 수준입니다. 필요한 상품이라면 옵션·배송비를 확인한 뒤 사도 기록상 손해 보는 시점은 아닙니다.`);
  } else if (stats.current <= band.low) {
    whenToBuy.push(`자주 보인 가격대보다 낮습니다. 최저가 ${won(min)}까지 기다릴지는 ${daysSinceLowest > 30 ? "최저가가 한 달 넘게 나오지 않았다는 점" : "최저가가 최근에도 나왔다는 점"}을 함께 고려하세요.`);
  } else {
    whenToBuy.push(`급하지 않다면 ${won(band.low)} 이하로 내려올 때를 기다리는 편이 기록상 유리합니다. 이 가격대는 기록한 날의 약 4분의 1에서 관측됐습니다.`);
  }
  whenToBuy.push("가격 기준 저장 기능에 목표가를 넣어 두면, 다음 방문 때 마지막 수집 가격과 비교해 보여 줍니다. 자동 알림은 보내지 않습니다.");
  return { paragraphs, whenToBuy, band };
}
