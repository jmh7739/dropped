import type { Metadata } from "next";
import Home from "../page";
import { SITE_URL } from "@/lib/site";
import { getDeals } from "@/lib/deals";
import { isVerifiedBestDeal } from "@/lib/dropMetrics";

export async function generateMetadata(): Promise<Metadata> {
  const hasDeals = (await getDeals()).some(isVerifiedBestDeal);
  return {
    title: "검증된 베스트딜",
    description: "실제 가격 이력과 DROP SCORE를 기준으로 선별한 베스트딜을 확인하세요.",
    alternates: { canonical: `${SITE_URL}/deals` },
    robots: { index: hasDeals, follow: true },
  };
}

export default function DealsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  return <Home searchParams={{ ...searchParams, sec: "best" }} />;
}
