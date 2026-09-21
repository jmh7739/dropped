import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import SafeImage from "@/components/SafeImage";
import AdSenseScript from "@/components/AdSenseScript";
import { formatWon } from "@/lib/format";
import { getPriceInsights } from "@/lib/insights";
import { SITE_URL } from "@/lib/site";

export const revalidate = 1800;

export async function generateMetadata(): Promise<Metadata> {
  const insights = await getPriceInsights();
  return {
    title: "실제 상품 가격 추적 사례",
    description: "실제 수집한 상품 가격으로 관측 기간, 수집 횟수, 첫 가격, 최근 평균과 현재 가격을 비교합니다. 조건이 부족한 상품은 표시하지 않습니다.",
    alternates: { canonical: `${SITE_URL}/insights` },
    robots: { index: insights.length >= 3, follow: true },
  };
}

export default async function InsightsPage() {
  const insights = await getPriceInsights();
  return (
    <div className="mx-auto max-w-4xl">
      {insights.length >= 3 && <AdSenseScript />}
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "실제 가격 추적 사례" }]} />
      <h1 className="text-2xl font-extrabold">실제 상품 가격 추적 사례</h1>
      <p className="mt-3 text-base leading-7 text-gray-700">
        아래 금액은 예시로 만든 숫자가 아니라 해당 상품에서 수집한 가격 기록으로 계산했습니다.
        추적 14일 이상, 유효 기록 20회 이상, 최근 24시간 안에 가격을 확인한 상품만 표시합니다.
        조건에서 벗어나면 자동으로 목록에서 빠집니다.
      </p>
      {insights.length === 0 ? (
        <p className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          현재 이 기준을 충족하는 상품이 없습니다. 가격 이력이 다시 확인되면 목록에 표시됩니다.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {insights.map(({ product, stats, firstPrice, averageGapPercent }) => (
            <article key={product.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="grid gap-5 sm:grid-cols-[120px_1fr]">
                <SafeImage src={product.imageUrl} alt={`${product.title} 상품 이미지`} className="aspect-square w-full rounded-lg object-cover" />
                <div>
                  <p className="text-xs text-gray-500">{product.mallName || product.platform} · {product.categoryName}</p>
                  <h2 className="mt-1 text-lg font-bold leading-snug text-gray-900">{product.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {stats.trackedDays}일 동안 {stats.points}회 관측했습니다. 첫 기록은 {formatWon(firstPrice)},
                    마지막 확인가는 {formatWon(stats.current)}입니다. {stats.trackedDays >= 30 ? "최근 30일 평균" : `추적 ${stats.trackedDays}일 평균`}은 {formatWon(stats.avg30!)}이며
                    마지막 확인가는 평균보다 {averageGapPercent === 0 ? "거의 차이가 없습니다" : `${Math.abs(averageGapPercent)}% ${averageGapPercent > 0 ? "낮습니다" : "높습니다"}`}.
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-4">
                <div><dt className="text-gray-500">마지막 확인가</dt><dd className="font-bold">{formatWon(stats.current)}</dd></div>
                <div><dt className="text-gray-500">{stats.trackedDays >= 30 ? "30일 평균" : `추적 ${stats.trackedDays}일 평균`}</dt><dd className="font-bold">{formatWon(stats.avg30!)}</dd></div>
                <div><dt className="text-gray-500">추적 기간 최저</dt><dd className="font-bold">{formatWon(stats.minAll)}</dd></div>
                <div><dt className="text-gray-500">더 낮았던 기록</dt><dd className="font-bold">{stats.percentile}%</dd></div>
              </dl>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-gray-500">최근 확인: {new Date(product.lastCheckedAt!).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · 결제 가격은 판매처에서 재확인</p>
                <Link href={`/price/${product.id}`} className="font-bold text-brand hover:underline">전체 가격 그래프 보기 →</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
