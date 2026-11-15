import BreadcrumbLd from "@/components/BreadcrumbLd";
import { withOg } from "@/lib/seo";
import type { Metadata } from "next";
import Home from "../page";
import { SITE_URL } from "@/lib/site";
import { getDeals } from "@/lib/deals";
import Link from 'next/link';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const hasDeals = (await getDeals({ priceStatus: "plunge" }).catch(() => []))
    .some((deal) => (deal.trackedDays ?? 0) >= 14 && (deal.historyPointCount ?? 0) >= 20);
  return withOg({
    title: "지금 가격 급락",
    description: "판매자 정가가 아닌 실제 가격 이력의 평균보다 크게 떨어진 상품을 확인하세요.",
    alternates: { canonical: `${SITE_URL}/price-drop` },
    robots: { index: hasDeals && Object.keys(await searchParams).length === 0, follow: true },
  });
}

export default async function PriceDropPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const deals = await getDeals({ priceStatus: 'plunge' }).catch(() => []);
  const comparable = deals.some(deal => (deal.trackedDays ?? 0) >= 14 && (deal.historyPointCount ?? 0) >= 20);
  if (!comparable) return <section className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-white p-6">
    <BreadcrumbLd items={[{ label: '가격 급락', href: '/price-drop' }]} />
    <h1 className="text-2xl font-black">가격 급락 자료 확인 안내</h1>
    <p className="mt-4 leading-7">현재 가격 이력 기준을 충족하는 급락 목록을 확정할 수 없습니다. 자료가 없는 상태와 실제 급락 상품이 없는 상태를 구분할 수 없어 상품 수를 표시하지 않습니다. 최신 가격은 공식 판매처에서 확인해 주세요.</p>
    <p className="mt-3 leading-7">평균 가격과 비교하려면 충분한 관측 기간과 가격 기록이 필요합니다. 관측이 다시 쌓이면 같은 기준으로 목록을 갱신합니다.</p>
    <nav aria-label="가격 자료가 부족할 때 확인할 곳" className="mt-5 flex flex-wrap gap-4">
      <Link className="underline" href="/store-deals">마트·편의점 행사 확인</Link>
      <Link className="underline" href="/tracking">가격 추적 상태 확인</Link>
      <Link className="underline" href="/guides/price-drop-failures">가격 비교 시 주의할 점</Link>
    </nav>
  </section>;
  return <><BreadcrumbLd items={[{ label: "가격 급락", href: "/price-drop" }]} /><Home searchParams={Promise.resolve({ ...(await searchParams), ps: "plunge" })} /></>;
}
