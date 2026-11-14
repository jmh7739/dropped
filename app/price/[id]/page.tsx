import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductReport } from "@/lib/products";
import { getRelatedDeals } from "@/lib/deals";
import { formatWon, timeAgo, observedAtLabel } from "@/lib/format";
import { priceStats, buyVerdict, isFreshPriceObservation, stalePriceVerdict } from "@/lib/priceReport";
import { PLATFORM_LABEL, Platform } from "@/lib/types";
import { dropScore } from "@/lib/dropMetrics";
import PriceChart from "@/components/PriceChart";
import PriceReport from "@/components/PriceReport";
import PriceWatch from "@/components/PriceWatch";
import LikeButton from "@/components/LikeButton";
import BuyButton from "@/components/BuyButton";
import ShareButton from "@/components/ShareButton";
import SafeImage from "@/components/SafeImage";
import DealCard from "@/components/DealCard";
import Breadcrumb from "@/components/Breadcrumb";
import { ShippingBadge } from "@/components/DiscountBadge";
import { SITE_URL as SITE } from "@/lib/site";
import { productDisplayTitle, leadWithProductName } from "@/lib/productTitle";
import { purchaseSummary } from "@/lib/purchaseSummary";
import CoupangPartnersNotice from "@/components/CoupangPartnersNotice";

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
  const period = stats ? `추적 ${stats.trackedDays}일 · ${stats.points}회 가격 확인 · 서로 다른 날짜 ${stats.observedDays}일` : "가격 이력 수집 중";
  const displayTitle = productDisplayTitle(leadWithProductName(r.title));
  return {
    title: stats?.enoughData ? `${displayTitle} 가격 추이` : `${displayTitle} 마지막 확인 가격`,
    description: r.currentPrice == null
      ? `${r.categoryName} · 가격 이력 수집을 준비하고 있습니다.`
      : `${r.categoryName} · 마지막 확인 가격 ${formatWon(r.currentPrice)} · ${period}. 가격 변동과 수집 시점을 확인하세요.`,
    robots: { index: indexable, follow: true },
    alternates: { canonical },
    openGraph: {
      title: stats?.enoughData ? `${displayTitle} 가격 추이` : `${displayTitle} 마지막 확인 가격`,
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
    getRelatedDeals(r.categorySlug, r.id, 6, r.title),
  ]);

  const currentPrice = r.currentPrice;
  const stats = currentPrice == null ? null : priceStats(r.history, currentPrice);
  const realRate =
    stats && currentPrice != null && stats.avg30 && stats.avg30 > currentPrice
      ? Math.round(((stats.avg30 - currentPrice) / stats.avg30) * 100)
      : 0;
  const freshObservation = isFreshPriceObservation(r.lastCheckedAt);
  const verdict = stats
    ? freshObservation ? buyVerdict(realRate, stats.isLowest, stats.lowestLabel, stats.enoughData) : stalePriceVerdict()
    : null;
  const score =
    stats && verdict && currentPrice != null && freshObservation
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
      url: r.affiliateUrl,
      seller: { "@type": "Organization", name: r.mallName ?? undefined },
    },
  } : null;

  const categoryHref = `/category/${r.categorySlug}`;
  const headingTitle = leadWithProductName(r.title);
  const summary = stats && currentPrice != null
    ? purchaseSummary({ current: currentPrice, stats, platform: r.platform, shippingFee: r.shippingFee, lastCheckedAt: r.lastCheckedAt, fresh: freshObservation })
    : null;
  const observed = observedAtLabel(r.lastCheckedAt);

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
          { label: productDisplayTitle(headingTitle, 40) },
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
          <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-600">
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
              {mall(r)}
            </span>
            <Link href={categoryHref} className="hover:text-gray-600">
              {r.categoryName}
            </Link>
          </div>

          <h1 className="line-clamp-2 break-words text-lg font-bold leading-snug" title={r.title}>{headingTitle}</h1>
          {headingTitle !== r.title.replace(/\s+/g, " ").trim() || r.title.length > 60 ? (
            <details className="mt-1 text-[13px] text-gray-600">
              <summary className="cursor-pointer font-semibold">판매처 원래 상품명 보기</summary>
              <p className="mt-1 break-words">{r.title}</p>
            </details>
          ) : null}
          {currentPrice == null ? (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
              요즘 뜨는 상품으로 새로 등록됐습니다. 가격 이력 수집을 준비하고 있습니다.
            </div>
          ) : !freshObservation ? (
            <div className="mt-3 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800">
              마지막 가격 확인이 48시간을 넘었습니다. 아래 가격은 이력이며 현재 판매가와 구매 판정은 판매 페이지에서 다시 확인해 주세요.
            </div>
          ) : !r.hasActiveDeal && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              이 특가는 종료되었거나 판매 페이지 가격이 바뀌었을 수 있습니다. 마지막 수집 가격 기준으로 비슷한 현재 특가를 확인해 주세요.
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {stats?.enoughData && (score || verdict) && (
              <span
                className={`inline-flex items-center gap-1 rounded-full text-xs font-extrabold ${scoreClass}`}
              >
                {scoreEmoji} {scoreLabel}
              </span>
            )}
            <ShippingBadge fee={r.shippingFee} />
          </div>
          {stats?.enoughData && stats.avg30 != null && currentPrice != null && (
            <p className="mt-2 text-xs text-gray-600">
              최근 30일 관측 평균 {formatWon(stats.avg30)} 대비 {realRate > 0 ? `${realRate}% 낮음` : "하락 아님"} · 가격 점수는 이전 최저가와 추적 기간도 함께 반영합니다.
            </p>
          )}

          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            {currentPrice != null && r.listPrice > 0 && r.listPrice > currentPrice && (
              <div className="text-sm text-gray-600 line-through">
                정가 {formatWon(r.listPrice)}
              </div>
            )}
            {currentPrice == null ? (
              <div className="mt-1 text-lg font-extrabold text-gray-600">가격 수집 준비 중</div>
            ) : (
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl font-extrabold text-brand">{formatWon(currentPrice)}</span>
                {observed && <span className="text-[13px] font-semibold text-gray-600">{observed}</span>}
              </div>
            )}
            {currentPrice != null && (
              <p className="mt-1 text-xs text-gray-500">마지막 수집 시점의 가격 · 실시간 판매가가 아닙니다</p>
            )}
            {r.unitPrice && (
              <div className="mt-0.5 text-sm text-gray-600">{r.unitPrice}</div>
            )}
            {r.lastCheckedAt && (
              <div className="mt-2 text-xs text-gray-600" suppressHydrationWarning>
                마지막 자동 관측: {timeAgo(r.lastCheckedAt)}
              </div>
            )}
          </div>

          {stats && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-extrabold text-gray-900">이 상품의 가격 이력</h2>
              {stats.enoughData ? <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div><dt className="text-gray-500">관측 범위</dt><dd className="font-bold">추적 {stats.trackedDays}일 · {stats.points}회 · 관측일 {stats.observedDays}일</dd></div>
                <div><dt className="text-gray-500">{stats.trackedDays >= 30 ? "30일 평균" : `추적 ${stats.trackedDays}일 평균`}</dt><dd className="font-bold">{stats.avg30 != null ? formatWon(stats.avg30) : "자료 없음"}</dd></div>
                <div><dt className="text-gray-500">{stats.lowestLabel}</dt><dd className="font-bold">{formatWon(stats.trackedDays >= 90 ? stats.min90 ?? stats.minAll : stats.minAll)}</dd></div>
                <div><dt className="text-gray-500">가격 위치</dt><dd className="font-bold">더 낮았던 기록 {stats.percentile}%</dd></div>
              </dl> : <p className="mt-2 text-sm text-gray-600">추적 {stats.trackedDays}일 · 가격 확인 {stats.points}회 중 서로 다른 관측일은 {stats.observedDays}일입니다. 가격 판정에는 최소 14일의 추적 기간과 서로 다른 관측일 14일이 모두 필요합니다.</p>}
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
          <CoupangPartnersNotice className="mt-2" />
          <p className="mt-2 text-center text-[13px] text-gray-600">
            제휴 링크입니다. 표시 가격은 선택 옵션·배송지·배송비·쿠폰 적용에 따라 최종 결제금액과 다를 수 있습니다. 구매 전에 판매 페이지에서 옵션과 총액을 확인하세요.
          </p>
          <PriceWatch productId={r.id} currentPrice={currentPrice}
            lowestPrice={stats?.min90 ?? stats?.minAll ?? null} checkedAt={r.lastCheckedAt} trackedDays={stats?.trackedDays ?? null} />
        </div>
      </div>

      {summary && (
        <section aria-labelledby="purchase-summary" className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
          <h2 id="purchase-summary" className="text-base font-bold text-gray-900">구매 판단 요약</h2>
          <p className="mt-2 text-base font-semibold leading-7 text-gray-900">{summary.headline}</p>
          {summary.paragraphs.map((text) => (
            <p key={text} className="mt-2 text-[15px] leading-7 text-gray-700">{text}</p>
          ))}
          <h3 className="mt-4 text-sm font-bold text-gray-900">사기 전에 확인할 것</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-gray-700">
            {summary.checklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
          {r.platform === "aliexpress" && (
            <p className="mt-2 text-[13px] text-gray-600">
              통관·관부가세 기준은 <a href="https://unipass.customs.go.kr" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">관세청 유니패스</a>에서 확인할 수 있습니다.
            </p>
          )}
          <p className="mt-3 text-[13px] text-gray-600">
            확인 시각: {summary.checkedLabel ?? "기록 없음"} · 이 요약은 떨어졌다가 수집한 가격 기록으로 자동 계산했으며, 판매 페이지의 현재 가격과 다를 수 있습니다.
          </p>
        </section>
      )}

      {stats?.enoughData && verdict && (
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

      {r.history.length >= 3 && (stats?.trackedDays ?? 0) >= 2 && <section className="mt-8">
        <h2 className="mb-2 text-base font-bold">📉 가격 변동 그래프</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <PriceChart history={r.history} referenceTime={Date.now()} />
        </div>
      </section>}

      {relatedDeals.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">📦 비슷한 상품 특가</h2>
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
