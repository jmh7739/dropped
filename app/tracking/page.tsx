import BreadcrumbLd from "@/components/BreadcrumbLd";
import { withOg } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import TrackedProductCatalog from "@/components/TrackedProductCatalog";
import { getRecentlyTrackedProducts, type TrackedProductRow } from "@/lib/products";
import { formatWon, observedAtLabel } from "@/lib/format";
import { pickTrackingExamples } from "@/lib/trackingExamples";

export const revalidate = 300;
export const metadata: Metadata = withOg({
  title: "전체 상품 둘러보기 · 가격 추적 방식",
  description: "여러 판매처에서 가격을 수집 중인 상품을 판매처·카테고리별로 검색하고, 가격 추적이 어떻게 이뤄지는지와 실제 추적 사례를 확인하세요.",
  alternates: { canonical: "/tracking" },
  robots: { index: false, follow: true },
});

const STEPS = [
  ["가격 수집", "제휴 판매처 피드와 공개 상품 페이지에서 같은 상품의 판매가를 정해진 주기로 기록합니다. 기록 시각은 상품마다 따로 남깁니다."],
  ["하루 대표가격", "하루에 여러 번 확인한 가격은 한국 날짜별 중앙값 하나로 줄여, 순간적인 오류값이 평균을 흔들지 않게 합니다."],
  ["평균·최저가 비교", "마지막 확인가를 최근 30일 평균(추적 기간이 짧으면 그 기간 평균)과 추적 기간 최저가에 비교합니다."],
  ["기준 충족 표시", "14일 이상 추적하고 유효한 기록이 20회 이상인 상품만 '이력 기준 충족' 후보가 됩니다. 기록이 짧으면 참고용으로만 보여 줍니다."],
] as const;

function ExampleCard({ row, label, note }: { row: TrackedProductRow; label: string; note: string }) {
  return <li className="rounded-xl border border-gray-200 bg-white p-4">
    <p className="text-sm font-bold text-brand">{label}</p>
    <Link href={`/price/${row.id}`} className="mt-1 line-clamp-2 block text-base font-bold leading-6 text-gray-950 hover:underline">{row.title}</Link>
    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
      <div><dt className="text-gray-600">마지막 확인가</dt><dd className="font-bold">{formatWon(row.currentPrice)}</dd></div>
      <div><dt className="text-gray-600">{row.averageLabel}</dt><dd className="font-bold">{row.averagePrice ? formatWon(row.averagePrice) : "기록 부족"}</dd></div>
      <div><dt className="text-gray-600">{row.lowestLabel}</dt><dd className="font-bold">{row.lowestPrice ? formatWon(row.lowestPrice) : "기록 부족"}</dd></div>
      <div><dt className="text-gray-600">추적 기간</dt><dd className="font-bold">{row.trackedDays}일 · {row.mallName ?? row.platform}</dd></div>
    </dl>
    <p className="mt-3 text-sm leading-6 text-gray-700">{note}</p>
    {observedAtLabel(row.lastCheckedAt) && <p className="mt-1 text-xs text-gray-600">{observedAtLabel(row.lastCheckedAt)}</p>}
  </li>;
}

export default async function TrackingPage() {
  let rows: TrackedProductRow[] = [];
  try { rows = await getRecentlyTrackedProducts(240); } catch (error) { console.error("tracking catalog unavailable", error); }
  const malls = new Set(rows.map((row) => row.mallName ?? row.platform));
  const examples = pickTrackingExamples(rows);
  return <div><BreadcrumbLd items={[{ label: "전체 상품", href: "/tracking" }]} />
    <header className="mb-6">
      <p className="text-sm font-extrabold text-brand">가격 추적 카탈로그</p>
      <h1 className="mt-1 text-2xl font-black text-gray-950">전체 상품 둘러보기와 가격 추적 방식</h1>
      <p className="mt-2 max-w-3xl text-base leading-7 text-gray-700">핫딜로 고르기 전 단계의 상품까지 모두 모았습니다. 각 상품은 판매처가 적은 정가 할인 대신, Dropped가 직접 기록한 가격 이력과 비교합니다. 아래에서 추적 방식과 실제 사례를 먼저 확인한 뒤 상품을 검색해 보세요.</p>
    </header>

    <section aria-labelledby="how-heading" className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
      <h2 id="how-heading" className="text-lg font-extrabold text-gray-950">가격 추적은 이렇게 작동합니다</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {STEPS.map(([title, copy], i) => <li key={title} className="rounded-xl bg-gray-50 p-4"><strong className="text-base text-gray-950">{i + 1}. {title}</strong><p className="mt-1 text-sm leading-6 text-gray-700">{copy}</p></li>)}
      </ol>
      <p className="mt-4 text-sm leading-6 text-gray-700">표시 가격은 마지막 수집 시점의 기록이며 실시간 판매가가 아닙니다. 옵션·배송비·쿠폰에 따라 결제 금액이 달라질 수 있으니 구매 전 판매 페이지에서 다시 확인하세요. 판단이 틀리는 경우는 <Link href="/guides/price-drop-failures" className="font-bold text-brand underline">가격 판단 실패 사례</Link>에 정리했습니다.</p>
    </section>

    <section aria-labelledby="examples-heading" className="mb-8">
      <h2 id="examples-heading" className="text-lg font-extrabold text-gray-950">실제 추적 기록으로 보는 세 가지 경우</h2>
      {examples.length ? <ul className="mt-3 grid gap-3 md:grid-cols-3">
        {examples.map((e) => <ExampleCard key={e.row.id} {...e} />)}
      </ul> : <div className="mt-3 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
        <p>평균보다 낮은 경우, 평균과 비슷한 경우, 기록이 아직 짧은 경우를 구분해 읽습니다. 지금은 사례로 고를 최신 기록을 이 화면에 싣지 못했습니다.</p>
        <p className="mt-2"><Link href="/insights" className="font-bold text-brand underline">실제 가격 추적 사례 모음</Link>과 <Link href="/guides" className="font-bold text-brand underline">가격 비교 가이드</Link>에서 같은 기준으로 정리한 예시를 볼 수 있습니다.</p>
      </div>}
    </section>

    <section aria-labelledby="catalog-heading">
      <h2 id="catalog-heading" className="text-lg font-extrabold text-gray-950">상품 검색</h2>
      {rows.length ? <>
        <p className="mb-3 mt-1 text-sm leading-6 text-gray-700">현재 {malls.size}개 판매처의 중복 제거 상품 {rows.length}개를 검색할 수 있으며, 각 상품에서 현재 확인가와 가격 기록을 볼 수 있습니다.</p>
        <TrackedProductCatalog rows={rows} />
      </> : <div className="mt-2 rounded-xl border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-700">
        <p>상품 목록은 다음 갱신 때 다시 표시됩니다. 그동안 아래 페이지에서 가격 기록을 확인할 수 있습니다.</p>
        <ul className="mt-3 flex flex-wrap gap-2 font-bold">
          <li><Link href="/price-drop" className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-4">가격급락 상품</Link></li>
          <li><Link href="/lowest-price" className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-4">추적 최저가 상품</Link></li>
          <li><Link href="/store-deals" className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-4">마트·편의점 행사</Link></li>
        </ul>
      </div>}
    </section>
  </div>;
}
