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
    title: `${label} 검증 핫딜`,
    description: `${label} 상품 중 실제 가격 이력으로 검증한 할인만 확인하세요.`,
    alternates: { canonical: `${SITE_URL}/deals/${routeParams.scope}` },
    robots: { index: hasDeals && Object.keys(query).length === 0, follow: true },
  };
}

export default async function ScopedDealsPage({ params, searchParams }: { params: Promise<{ scope: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  if (!(routeParams.scope in scopes)) notFound();
  return <Home searchParams={Promise.resolve({ ...query, scope: routeParams.scope === "global" ? "overseas" : "domestic", sec: "best" })} />;
}
