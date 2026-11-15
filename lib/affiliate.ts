/** 쿠팡 파트너스 이용약관이 요구하는 고지 문구. 문구를 바꾸지 마세요. 쿠팡 링크가 있는 곳에만 표시합니다. */
export const COUPANG_PARTNERS_NOTICE =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

/** 알리익스프레스 어필리에이트 링크 고지 (공정위 추천·보증 심사지침: 경제적 이해관계 명시). */
export const ALIEXPRESS_AFFILIATE_NOTICE =
  "이 페이지의 알리익스프레스 링크는 알리익스프레스 어필리에이트 제휴 링크입니다. 링크를 통해 구매하면 Dropped가 판매 금액의 일부를 수수료로 받을 수 있으며, 구매자가 내는 가격은 달라지지 않습니다.";

/** 링크프라이스(국내 쇼핑몰 제휴 네트워크) 링크 고지. */
export const LINKPRICE_AFFILIATE_NOTICE =
  "이 페이지의 국내 쇼핑몰 링크 일부는 링크프라이스 제휴 링크입니다. 링크를 통해 구매하면 Dropped가 일정액의 수수료를 받을 수 있으며, 구매자가 내는 가격은 달라지지 않습니다.";

/** 사이트 전체 일반 고지 (특정 제휴 프로그램의 고정 문구가 아님). */
export const GENERAL_AFFILIATE_NOTICE =
  "이 사이트의 판매처 링크에는 제휴 링크가 포함되어 있으며, 링크를 통해 구매하면 Dropped가 일정액의 수수료를 받을 수 있습니다. 구매자가 내는 가격은 달라지지 않습니다.";

export type AffiliateProgram = "coupang" | "aliexpress" | "linkprice";

/** 링크 주소 또는 상품 플랫폼으로 제휴 프로그램을 판별합니다. 모르는 링크는 null. */
export function affiliateProgram(input: { url?: string | null; platform?: string | null }): AffiliateProgram | null {
  const url = (input.url ?? "").toLowerCase();
  let host = "";
  try { host = url ? new URL(url).hostname : ""; } catch { host = ""; }
  if (host === "coupang.com" || host.endsWith(".coupang.com")) return "coupang";
  if (host.endsWith("aliexpress.com") || host.endsWith("aliexpress.us") || host === "s.click.aliexpress.com") return "aliexpress";
  if (host.endsWith("linkprice.com")) return "linkprice";
  if (input.platform === "coupang") return "coupang";
  if (input.platform === "aliexpress") return "aliexpress";
  if (input.platform === "cps") return "linkprice";
  return null;
}

/** 여러 링크에서 실제로 쓰인 제휴 프로그램 목록(순서 고정, 중복 제거). */
export function affiliatePrograms(items: { url?: string | null; platform?: string | null }[]): AffiliateProgram[] {
  const found = new Set(items.map(affiliateProgram).filter((p): p is AffiliateProgram => !!p));
  return (["coupang", "aliexpress", "linkprice"] as const).filter((p) => found.has(p));
}

export const PROGRAM_NOTICE: Record<AffiliateProgram, string> = {
  coupang: COUPANG_PARTNERS_NOTICE,
  aliexpress: ALIEXPRESS_AFFILIATE_NOTICE,
  linkprice: LINKPRICE_AFFILIATE_NOTICE,
};
