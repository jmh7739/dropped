import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductReport } from "@/lib/products";
import { formatWon } from "@/lib/format";
import { priceStats, buyVerdict } from "@/lib/priceReport";
import { PLATFORM_LABEL, Platform } from "@/lib/types";
import { dropScore } from "@/lib/dropMetrics";
import PriceChart from "@/components/PriceChart";
import PriceReport from "@/components/PriceReport";
import LikeButton from "@/components/LikeButton";
import BuyButton from "@/components/BuyButton";
import ShareButton from "@/components/ShareButton";
import SafeImage from "@/components/SafeImage";
import { ShippingBadge } from "@/components/DiscountBadge";

// Supabase 읽기가 no-store라 동적 렌더. (딜이 끝나도 유지되는 영구 상품 리포트)
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dropped.kr";

function mall(r: { mallName: string | null; platform: string }): string {
  return r.mallName || PLATFORM_LABEL[r.platform as Platform] || r.platform;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const r = await getProductReport(Number(params.id));
  if (!r) return { title: "상품을 찾을 수 없음" };
  const canonical = `${SITE}/price/${r.id}`;
  return {
    title: `${r.title} 최저가·가격추이`,
    description: `${r.categoryName} · 현재 ${formatWon(r.currentPrice)} — 가격 이력으로 지금이 살 때인지 알려드려요.`,
    alternates: { canonical },
    openGraph: {
      title: `${r.title} 최저가·가격추이`,
      url: canonical,
      images: r.imageUrl ? [r.imageUrl] : [],
    },
  };
}

export default async function ProductPricePage({
  params,
}: {
  params: { id: string };
}) {
  const r = await getProductReport(Number(params.id));
  if (!r) notFound();

  const stats = priceStats(r.history, r.currentPrice);
  // 판정은 '평소가(30일 평균) 대비'로만 — 정가는 안 믿음(참고 표시만).
  const realRate =
    stats && stats.avg30 && stats.avg30 > r.currentPrice
      ? Math.round(((stats.avg30 - r.currentPrice) / stats.avg30) * 100)
      : 0;
  const verdict = stats
    ? buyVerdict(realRate, stats.isLowest, stats.lowestLabel, stats.enoughData)
    : null;
  const score =
    stats && verdict
      ? dropScore({
          platform: r.platform as Platform,
          categorySlug: r.categorySlug,
          discountVsAvg: realRate > 0 ? realRate : null,
          discountVsList: 0,
          isLowestEver: stats.isLowest,
          likeCount: 0,
          clickCount: 0,
          baselinePrice: stats.avg30 ?? 0,
          currentPrice: r.currentPrice,
        })
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: r.title,
    image: r.imageUrl ? [r.imageUrl] : undefined,
    category: r.categoryName,
    offers: {
      "@type": "Offer",
      price: r.currentPrice,
      priceCurrency: "KRW",
      availability: r.hasActiveDeal
        ? "https://schema.org/InStock"
        : "https://schema.org/LimitedAvailability",
      url: `${SITE}/price/${r.id}`,
      seller: { "@type": "Organization", name: r.mallName ?? undefined },
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-800"
      >
        ← 목록으로
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <SafeImage
            src={r.imageUrl}
            alt={r.title}
            className="aspect-square w-full object-cover"
          />
        </div>

        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
              {mall(r)}
            </span>
            <span>{r.categoryName}</span>
          </div>

          <h1 className="text-lg font-bold leading-snug">{r.title}</h1>
          {!r.hasActiveDeal && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              이 특가는 종료되었거나 판매 페이지 가격이 바뀌었을 수 있습니다. 마지막 수집 가격 기준으로 비슷한 현재 특가를 확인해 주세요.
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {verdict && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-extrabold ${verdict.cls}`}
              >
                {verdict.icon} {verdict.title}
              </span>
            )}
            <ShippingBadge fee={r.shippingFee} />
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            {r.listPrice > 0 && r.listPrice > r.currentPrice && (
              <div className="text-sm text-gray-400 line-through">
                정가 {formatWon(r.listPrice)}
              </div>
            )}
            <div className="mt-1 text-3xl font-extrabold text-brand">
              {formatWon(r.currentPrice)}
            </div>
            {r.unitPrice && (
              <div className="mt-0.5 text-sm text-gray-400">{r.unitPrice}</div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <LikeButton productId={r.id} initialCount={0} />
            <ShareButton path={`/price/${r.id}`} title={r.title} compact />
            <div className="flex-1">
              <BuyButton productId={r.id} href={r.affiliateUrl}>
                판매 페이지로 →
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
          <h2 className="mb-2 text-base font-bold">🧾 가격 리포트 — 지금 살까?</h2>
          <PriceReport
            stats={stats}
            verdict={verdict}
            listPrice={r.listPrice}
            dropScore={score ?? undefined}
          />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-base font-bold">📉 가격 변동 그래프</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <PriceChart history={r.history} />
        </div>
      </section>
    </div>
  );
}
