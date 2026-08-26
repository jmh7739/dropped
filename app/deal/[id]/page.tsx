import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getDeal } from "@/lib/deals";
import { formatWon, headlineDiscount, timeAgo } from "@/lib/format";
import { mallLabel } from "@/lib/types";
import PriceChart from "@/components/PriceChart";
import LikeButton from "@/components/LikeButton";
import BuyButton from "@/components/BuyButton";
import ShareButton from "@/components/ShareButton";
import SafeImage from "@/components/SafeImage";
import {
  DiscountBadge,
  LowestEverBadge,
  PriceErrorBadge,
  ShippingBadge,
} from "@/components/DiscountBadge";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const deal = await getDeal(Number(params.id));
  if (!deal) return { title: "딜을 찾을 수 없음" };
  return {
    title: `${deal.title} — ${formatWon(deal.currentPrice)} | 떨어졌다`,
    description: `${deal.categoryName} · 평소 ${formatWon(
      deal.baselinePrice
    )} → 현재 ${formatWon(deal.currentPrice)}`,
    openGraph: {
      title: deal.title,
      images: deal.imageUrl ? [deal.imageUrl] : [],
    },
  };
}

export default async function DealDetail({
  params,
}: {
  params: { id: string };
}) {
  const deal = await getDeal(Number(params.id));
  if (!deal) notFound();

  const { rate, basis } = headlineDiscount(deal);

  // 구글 리치 결과용 Product 구조화 데이터
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.title,
    image: deal.imageUrl ? [deal.imageUrl] : undefined,
    category: deal.categoryName,
    offers: {
      "@type": "Offer",
      price: deal.currentPrice,
      priceCurrency: "KRW",
      availability:
        deal.status === "active"
          ? "https://schema.org/InStock"
          : "https://schema.org/Discontinued",
      seller: { "@type": "Organization", name: deal.mallName ?? undefined },
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
        {/* 이미지 */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <SafeImage
            src={deal.imageUrl}
            alt={deal.title}
            className="aspect-square w-full object-cover"
          />
        </div>

        {/* 정보 */}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
              {mallLabel(deal)}
            </span>
            <span>{deal.categoryName}</span>
            <span>· {timeAgo(deal.detectedAt)} 감지</span>
          </div>

          <h1 className="text-lg font-bold leading-snug">{deal.title}</h1>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <DiscountBadge rate={rate} basis={basis} />
            {deal.isLowestEver && <LowestEverBadge />}
            {deal.isPriceError && <PriceErrorBadge />}
            <ShippingBadge fee={deal.shippingFee} />
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-400 line-through">
              정가 {formatWon(deal.listPrice)}
            </div>
            <div className="text-sm text-gray-500">
              평소 평균 {formatWon(deal.baselinePrice)}
            </div>
            <div className="mt-1 text-3xl font-extrabold text-brand">
              {formatWon(deal.currentPrice)}
            </div>
            {deal.unitPrice && (
              <div className="mt-0.5 text-sm text-gray-400">
                {deal.unitPrice}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <LikeButton productId={deal.id} initialCount={deal.likeCount} />
            <ShareButton path={`/deal/${deal.id}`} title={deal.title} compact />
            <div className="flex-1">
              <BuyButton productId={deal.id} href={deal.affiliateUrl}>
                최저가로 사러 가기 →
              </BuyButton>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-gray-400">
            제휴 링크입니다. 구매 시 판매 페이지에서 최종 가격을 확인하세요.
            {deal.clickCount > 0 && ` · 지금까지 ${deal.clickCount}명이 눌러봤어요`}
          </p>
        </div>
      </div>

      {/* 가격 그래프 */}
      <section className="mt-8">
        <h2 className="mb-2 text-base font-bold">📉 가격 변동 그래프</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <PriceChart history={deal.history} />
        </div>
      </section>
    </div>
  );
}
