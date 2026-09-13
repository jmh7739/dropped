import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../../page";
import { SITE_URL } from "@/lib/site";
import { getDeals } from "@/lib/deals";
import { isVerifiedBestDeal } from "@/lib/dropMetrics";

const scopes = { domestic: "국내", global: "해외" } as const;

export function generateStaticParams() {
  return Object.keys(scopes).map((scope) => ({ scope }));
}

export async function generateMetadata({ params }: { params: { scope: string } }): Promise<Metadata> {
  if (!(params.scope in scopes)) return { robots: { index: false, follow: false } };
  const label = scopes[params.scope as keyof typeof scopes];
  const scope = params.scope === "global" ? "overseas" : "domestic";
  const hasDeals = (await getDeals({ scope })).some(isVerifiedBestDeal);
  return {
    title: `${label} 검증 베스트딜`,
    description: `${label} 상품 중 실제 가격 이력으로 검증한 할인만 확인하세요.`,
    alternates: { canonical: `${SITE_URL}/deals/${params.scope}` },
    robots: { index: hasDeals, follow: true },
  };
}

export default function ScopedDealsPage({ params, searchParams }: { params: { scope: string }; searchParams: Record<string, string | undefined> }) {
  if (!(params.scope in scopes)) notFound();
  return <Home searchParams={{ ...searchParams, scope: params.scope === "global" ? "overseas" : "domestic", sec: "best" }} />;
}
