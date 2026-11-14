import type { PriceStats } from "./priceReport";

export type PurchaseSummaryInput = {
  current: number;
  stats: PriceStats;
  platform: string;
  shippingFee: number | null;
  lastCheckedAt: string | null;
  fresh: boolean;
};

export type PurchaseSummary = {
  headline: string;
  paragraphs: string[];
  checklist: string[];
  checkedLabel: string | null;
};

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

export function checkedAtFullLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(t);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}년 ${get("month")}월 ${get("day")}일 ${get("hour")}:${get("minute")} (한국 시간)`;
}

/**
 * 가격 상세 페이지의 "구매 판단 요약". 실제 수집 이력(stats)에서만 계산하며,
 * 수집하지 않은 정보(쿠폰·옵션가 등)는 확인해야 할 항목으로만 안내한다.
 */
export function purchaseSummary(input: PurchaseSummaryInput): PurchaseSummary {
  const { current, stats, platform, shippingFee, lastCheckedAt, fresh } = input;
  const avg = stats.avg30;
  const avgLabel = stats.trackedDays >= 30 ? "최근 30일 평균" : `추적 ${stats.trackedDays}일 평균`;
  const lowest = stats.trackedDays >= 90 ? stats.min90 ?? stats.minAll : stats.minAll;
  const lowestLabel = stats.lowestLabel;
  const checkedLabel = checkedAtFullLabel(lastCheckedAt);
  const paragraphs: string[] = [];

  let compare = "";
  let diffRate = 0;
  if (avg != null && avg > 0) {
    diffRate = Math.round(((avg - current) / avg) * 100);
    compare = diffRate > 0
      ? `${avgLabel} ${won(avg)}보다 ${diffRate}%(${won(avg - current)}) 낮습니다`
      : diffRate < 0
      ? `${avgLabel} ${won(avg)}보다 ${-diffRate}%(${won(current - avg)}) 높습니다`
      : `${avgLabel} ${won(avg)}과 거의 같습니다`;
  }
  const lowestText = current <= lowest
    ? `${lowestLabel} ${won(lowest)}과 같은 수준입니다`
    : `${lowestLabel} ${won(lowest)}보다는 ${won(current - lowest)} 비쌉니다`;
  paragraphs.push(
    `마지막으로 확인한 가격은 ${won(current)}입니다. ${compare ? `${compare}. ` : ""}또 ${lowestText}.`,
  );
  paragraphs.push(
    `떨어졌다가 ${stats.trackedDays}일 동안 이 상품 가격을 ${stats.points}회 자동 확인했고, 그중 서로 다른 날짜는 ${stats.observedDays}일입니다.` +
      (stats.enoughData
        ? ` 기록한 날 가운데 지금보다 가격이 낮았던 날은 ${stats.percentile}%입니다.`
        : " 아직 14일·14개 관측일 기준을 채우지 못해 아래 판단은 참고용입니다."),
  );

  let headline: string;
  if (!fresh) {
    headline = "마지막 확인이 48시간을 넘어 지금 가격으로 판단할 수 없습니다. 판매 페이지에서 현재가를 다시 확인하세요.";
  } else if (!stats.enoughData) {
    headline = "가격 기록이 충분히 쌓이지 않았습니다. 급하지 않다면 기록이 더 쌓인 뒤 비교하는 편이 안전합니다.";
  } else if (current <= lowest) {
    headline = "추적 기간 중 가장 낮은 가격과 같은 수준입니다. 필요한 상품이라면 아래 조건을 확인한 뒤 구매를 고려할 만한 시점입니다.";
  } else if (diffRate >= 5) {
    headline = `평소보다 ${diffRate}% 낮은 편이지만 최저가는 아닙니다. 최저가와의 차이(${won(current - lowest)})를 감수할지 판단해 보세요.`;
  } else {
    headline = "평소 가격과 비슷하거나 높습니다. 급하지 않다면 가격 알림을 걸어 두고 기다리는 편이 낫습니다.";
  }

  const checklist: string[] = [
    "옵션: 표시 가격은 수집 시점의 기본 옵션 가격일 수 있습니다. 색상·용량·수량을 고르면 가격이 바뀌는지 확인하세요.",
    shippingFee == null
      ? "배송비: 배송비는 수집하지 못했습니다. 판매 페이지에서 배송비와 배송지별 추가 요금을 확인하세요."
      : shippingFee === 0
      ? "배송비: 수집 당시 무료배송으로 표시됐지만, 최소 주문 금액이나 도서·산간 추가 요금이 있는지 확인하세요."
      : `배송비: 수집 당시 배송비 ${won(shippingFee)}이 따로 표시됐습니다. 상품가와 합친 총액은 약 ${won(current + shippingFee)}입니다.`,
    "쿠폰·카드 할인: 이 가격에 쿠폰·카드 할인이 포함됐는지는 알 수 없습니다. 결제 단계에서 최종 금액을 확인하세요.",
  ];
  if (platform === "aliexpress") {
    checklist.push("해외직구: 배송 기간, 반품 조건, 통관·관부가세 대상 여부를 판매 페이지와 관세청 안내에서 확인하세요.");
  }
  if (platform === "coupang") {
    checklist.push("쿠팡: 회원 전용가나 판매자별 가격이 다를 수 있으니 같은 상품의 판매자와 배송 방식을 확인하세요.");
  }

  return { headline, paragraphs, checklist, checkedLabel };
}
