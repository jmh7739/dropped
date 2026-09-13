import type { Metadata } from "next";
import Home from "../page";
import { SITE_URL } from "@/lib/site";
import { getDeals } from "@/lib/deals";

export async function generateMetadata({ searchParams }: { searchParams: Record<string, string | undefined> }): Promise<Metadata> {
  const hasDeals = (await getDeals({ priceStatus: "plunge" }))
    .some((deal) => (deal.trackedDays ?? 0) >= 7 && (deal.historyPointCount ?? 0) >= 10);
  return {
    title: "지금 가격 급락",
    description: "판매자 정가가 아닌 실제 가격 이력의 평균보다 크게 떨어진 상품을 확인하세요.",
    alternates: { canonical: `${SITE_URL}/price-drop` },
    robots: { index: hasDeals && Object.keys(searchParams).length === 0, follow: true },
  };
}

export default function PriceDropPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  return <Home searchParams={{ ...searchParams, ps: "plunge" }} />;
}
