import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductReport } from "@/lib/products";
import { getRelatedDeals } from "@/lib/deals";
import { formatWon, timeAgo } from "@/lib/format";
import { priceStats, buyVerdict } from "@/lib/priceReport";
import { PLATFORM_LABEL, Platform } from "@/lib/types";
import { dropScore } from "@/lib/dropMetrics";
import PriceChart from "@/components/PriceChart";
import PriceReport from "@/components/PriceReport";
import LikeButton from "@/components/LikeButton";
import BuyButton from "@/components/BuyButton";
import ShareButton from "@/components/ShareButton";
import SafeImage from "@/components/SafeImage";
import DealCard from "@/components/DealCard";
import Breadcrumb from "@/components/Breadcrumb";
import { ShippingBadge } from "@/components/DiscountBadge";
import { SITE_URL as SITE } from "@/lib/site";

export const revalidate = 300;

function mall(r: { mallName: string | null; platform: string }): string {
  return r.mallName || PLATFORM_LABEL[r.platform as Platform] || r.platform;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const r = await getProductReport(Number((await params).id));
  if (!r) return { title: "상품을 찾을 수 없음", robots: { index: false, follow: false } };
  const canonical = `${SITE}/price/${r.id}`;
  const stats = r.currentPrice == null ? null : priceStats(r.history, r.currentPrice);
  const lastCheck = r.lastCheckedAt ? new Date(r.lastCheckedAt).getTime() : 0;
  const indexable = Boolean(stats?.enoughData && lastCheck > 0 && Date.now() - lastCheck <= 14 * 86400000);
  const period = stats ? `추적 ${stats.trackedDays}일 · ${stats.points}회 가격 확인` : "가격 이력 수집 중";
  return {
    title: `${r.title} 가격 추이 · 추적 최저가 · 평균가`,
    description: r.currentPrice == null
      ? `${r.categoryName} · 가격 이력 수집을 준비하고 있습니다.`
      : `${r.categoryName} · 마지막 확인 가격 ${formatWon(r.currentPrice)} · ${period}. 가격 변동과 수집 시점을 확인하세요.`,
    robots: { index: indexable, follow: true },
    alternates: { canonical },
    openGraph: {
      title: `${r.title} 가격 추이 · 추적 최저가 · 평균가`,
      url: canonical,
      images: r.imageUrl ? [r.imageUrl] : [],
    },
  };
}

export default async function ProductPricePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const r = await getProductReport(Number((await params).id));
  if (!r) notFound();

  const [relatedDeals] = await Promise.all([
    getRelatedDeals(r.categorySlug, r.id, 6),
  ]);

  const currentPrice = r.currentPrice;
  const stats = currentPrice == null ? null : priceStats(r.history, currentPrice);
  const realRate =
    stats && currentPrice != null && stats.avg30 && stats.avg30 > currentPrice
      ? Math.round(((stats.avg30 - currentPrice) / stats.avg30) * 100)
      : 0;
  const verdict = stats
    ? buyVerdict(realRate, stats.isLowest, stats.lowestLabel, stats.enoughData)
    : null;
  const score =
    stats && verdict && currentPrice != null
      ? dropScore({
          platform: r.platform as Platform,
          categorySlug: r.categorySlug,
          discountVsAvg: realRate > 0 ? realRate : null,
          discountVsList: 0,
          isLowestEver: stats.isLowest,
          likeCount: r.likeCount,
          clickCount: 0,
          baselinePrice: stats.avg30 ?? 0,
          currentPrice,
          trackedDays: stats.trackedDays,
          checkedAt: r.lastCheckedAt ?? null,
          avg30Price: stats.avg30 ?? null,
        })
      : null;
  const scoreTone = score?.tone ?? (score ? null : verdict ? null : "weak");
  const scoreClass =
    scoreTone === "hot"
      ? "border-green-200 bg-green-100 text-green-800"
      : scoreTone === "good"
      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
      : scoreTone === "ok"
      ? "border-yellow-200 bg-yellow-100 text-yellow-800"
      : scoreTone === "weak"
      ? "border-blue-200 bg-blue-100 text-blue-700"
      : "border-gray-200 bg-gray-100 text-gray-600";
  const scoreLabel = score?.label ?? verdict?.title;
  const scoreEmoji =
    scoreTone === "hot" || scoreTone === "good"
      ? "🟢"
      : scoreTone === "ok"
      ? "🟡"
      : scoreTone === "weak"
      ? "🔵"
      : "🟠";

  const recentlyChecked = r.lastCheckedAt && Date.now() - new Date(r.lastCheckedAt).getTime() <= 86400000;
  const jsonLd = stats?.enoughData && recentlyChecked && r.hasActiveDeal ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: r.title,
    image: r.imageUrl ? [r.imageUrl] : undefined,
    category: r.categoryName,
    offers: currentPrice == null ? undefined : {
      "@type": "Offer",
      price: currentPrice,
      priceCurrency: "KRW",
      availability: r.hasActiveDeal
        ? "https://schema.org/InStock"
        : "https://schema.org/LimitedAvailability",
      url: r.affiliateUrl,
      seller: { "@type": "Organization", name: r.mallName ?? undefined },
    },
  } : null;

  const categoryHref = `/category/${r.categorySlug}`;

  return (
    <div>
      {jsonLd && <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e"),
        }}
      />}

      <Breadcrumb
        items={[
          { label: "홈", href: "/" },
          { label: r.categoryName, href: categoryHref },
          { label: r.title },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <SafeImage
            src={r.imageUrl}
            alt={`${r.title} 상품 이미지`}
            className="aspect-square w-full object-cover"
          />
        </div>

        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
              {mall(r)}
            </span>
            <Link href={categoryHref} className="hover:text-gray-600">
              {r.categoryName}
            </Link>
          </div>

          <h1 className="text-lg font-bold leading-snug">{r.title} 가격 추이와 추적 최저가</h1>
          {currentPrice == null ? (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
              요즘 뜨는 상품으로 새로 등록됐습니다. 가격 이력 수집을 준비하고 있습니다.
            </div>
          ) : !r.hasActiveDeal && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              이 특가는 종료되었거나 판매 페이지 가격이 바뀌었을 수 있습니다. 마지막 수집 가격 기준으로 비슷한 현재 특가를 확인해 주세요.
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {(score || verdict) && (
              <span
                className={`inline-flex items-center gap-1 rounded-full text-xs font-extrabold ${scoreClass}`}
              >
                {scoreEmoji} {scoreLabel}
              </span>
            )}
            <ShippingBadge fee={r.shippingFee} />
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            {currentPrice != null && r.listPrice > 0 && r.listPrice > currentPrice && (
              <div className="text-sm text-gray-400 line-through">
                정가 {formatWon(r.listPrice)}
              </div>
            )}
            {currentPrice == null ? (
              <div className="mt-1 text-lg font-extrabold text-gray-600">가격 수집 준비 중</div>
            ) : (
              <div className="mt-1 text-3xl font-extrabold text-brand">{formatWon(currentPrice)}</div>
            )}
            {currentPrice != null && (
              <p className="mt-1 text-xs text-gray-500">마지막 수집 시점의 가격 · 실시간 판매가가 아닙니다</p>
            )}
            {r.unitPrice && (
              <div className="mt-0.5 text-sm text-gray-400">{r.unitPrice}</div>
            )}
            {r.lastCheckedAt && (
              <div className="mt-2 text-xs text-gray-400" suppressHydrationWarning>
                마지막 가격 확인: {timeAgo(r.lastCheckedAt)}
              </div>
            )}
          </div>

          {stats && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-extrabold text-gray-900">이 상품의 가격 이력</h2>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div><dt className="text-gray-500">관측 범위</dt><dd className="font-bold">{stats.trackedDays}일 · {stats.points}회</dd></div>
                <div><dt className="text-gray-500">{stats.trackedDays >= 30 ? "30일 평균" : `추적 ${stats.trackedDays}일 평균`}</dt><dd className="font-bold">{stats.avg30 != null ? formatWon(stats.avg30) : "자료 없음"}</dd></div>
                <div><dt className="text-gray-500">{stats.lowestLabel}</dt><dd className="font-bold">{formatWon(stats.trackedDays >= 90 ? stats.min90 ?? stats.minAll : stats.minAll)}</dd></div>
                <div><dt className="text-gray-500">가격 위치</dt><dd className="font-bold">더 낮았던 기록 {stats.percentile}%</dd></div>
              </dl>
              <p className="mt-2 text-xs text-gray-500">
                {stats.enoughData ? `DROP SCORE ${score?.score ?? "-"} · 기록된 가격 기준` : "추적 초기 · 데이터 신뢰도 낮음 · 구매 판정 참고용"}
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <LikeButton productId={r.id} initialCount={r.likeCount} />
            <ShareButton path={`/price/${r.id}`} title={r.title} compact />
            <div className="flex-1">
              <BuyButton productId={r.id} href={r.affiliateUrl}>
                {r.platform === "coupang" ? "쿠팡에서 보기 →" : "판매 페이지로 →"}
              </BuyButton>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-gray-400">
            제휴 링크입니다. 구매 시 판매 페이지에서 최종 가격을 확인하세요.
          </p>
        </div>
      </div>

      {stats && verdict && (
        <section className="mt-8">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">🧾 가격 리포트 — 지금 살까?</h2>
            <Link href="/guides/true-lowest-price" className="text-sm font-medium text-brand hover:underline">최저가 읽는 법 →</Link>
          </div>
          <PriceReport
            stats={stats}
            verdict={verdict}
            listPrice={r.listPrice}
            dropScore={score ?? undefined}
            lastCheckedAt={r.lastCheckedAt}
          />
        </section>
      )}

      {r.history.length > 0 ? <section className="mt-8">
        <h2 className="mb-2 text-base font-bold">📉 가격 변동 그래프</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <PriceChart history={r.history} />
        </div>
      </section> : (
        <section className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          가격 이력이 쌓이면 변동 그래프와 구매 판단을 제공합니다.
        </section>
      )}

      {relatedDeals.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">📦 {r.categoryName} 카테고리 특가</h2>
            <Link
              href={categoryHref}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              더보기 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {relatedDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
