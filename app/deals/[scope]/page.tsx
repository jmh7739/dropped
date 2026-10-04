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

export async function generateMetadata({ params, searchParams }: { params: Promise<{ scope: string }>; searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  if (!(routeParams.scope in scopes)) return { robots: { index: false, follow: false } };
  const label = scopes[routeParams.scope as keyof typeof scopes];
  const scope = routeParams.scope === "global" ? "overseas" : "domestic";
  const hasDeals = (await getDeals({ scope })).some(isVerifiedBestDeal);
  return {
    title: `${label} 가격 이력 기준 충족 상품`,
    description: `${label} 상품 중 자동 관측 이력으로 하락을 확인할 수 있는 상품을 살펴보세요. 원본 판매처의 옵션·재고·결제가는 별도 확인이 필요합니다.`,
    alternates: { canonical: `${SITE_URL}/deals/${routeParams.scope}` },
    robots: { index: hasDeals && Object.keys(query).length === 0, follow: true },
  };
}

export default async function ScopedDealsPage({ params, searchParams }: { params: Promise<{ scope: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  if (!(routeParams.scope in scopes)) notFound();
  return <Home searchParams={Promise.resolve({ ...query, scope: routeParams.scope === "global" ? "overseas" : "domestic", sec: "best" })} />;
}
