import Link from "next/link";
import { Deal, mallLabel } from "@/lib/types";
import { formatWon, headlineDiscount, displayTitle, brandFrom } from "@/lib/format";
import { dropScore } from "@/lib/dropMetrics";
import { dealVerdict } from "@/lib/priceReport";
import { StatusBadge, PriceErrorBadge, ShippingBadge } from "./DiscountBadge";
import LikeButton from "./LikeButton";
import BuyButton from "./BuyButton";
import ShareButton from "./ShareButton";
import SafeImage from "./SafeImage";

export default function DealCard({
  deal,
  variant = "gallery",
}: {
  deal: Deal;
  variant?: "gallery" | "list";
}) {
  const { rate, basis } = headlineDiscount(deal);
  const saving = (deal.baselinePrice || deal.listPrice) - deal.currentPrice;
  const ended = deal.status === "ended";
  const isCurated = deal.isCurated;
  const score = dropScore(deal);
  const trackedDays = deal.trackedDays;
  const brand = brandFrom(deal.title);
  // 홈/상세 판정 일관성: 카드도 상세와 동일한 buyVerdict(단일 source)로 판정.
  const verdict = !isCurated ? dealVerdict(deal) : null;

  // 국내몰 추천: 제휴사 실판매가 기준 할인(원가→할인가). 있으면 할인율·원가 표시.
  const curatedDisc =
    isCurated && deal.listPrice > deal.currentPrice
      ? Math.round(((deal.listPrice - deal.currentPrice) / deal.listPrice) * 100)
      : 0;
  const curatedBadge =
    curatedDisc > 0 ? (
      <span className="rounded-md bg-brand px-2 py-1 text-[11px] font-extrabold text-white shadow-sm">
        정가 -{curatedDisc}%
      </span>
    ) : null;
  // 취소선 표시 가격: 큐레이션은 원가, 급락딜은 평소가
  const strikePrice = isCurated
    ? curatedDisc > 0
      ? deal.listPrice
      : 0
    : deal.baselinePrice || deal.listPrice;

  const brandChip = brand ? (
    <span className="rounded bg-gray-900/85 px-1.5 py-0.5 font-bold text-white">
      {brand}
    </span>
  ) : null;

  // ── 리스트형: 한 줄에 조밀하게 (한 화면에 더 많이) ──
  if (variant === "list") {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 transition ${
          ended ? "opacity-70" : "hover:shadow-md"
        }`}
      >
        <Link
          href={`/price/${deal.productId}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
            <SafeImage
              src={deal.imageUrl}
              alt={deal.title}
              className={`h-full w-full object-cover ${ended ? "grayscale" : ""}`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
              {isCurated ? curatedBadge : <StatusBadge rate={rate} isLowestEver={deal.isLowestEver} trackedDays={trackedDays} basis={basis} />}
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                {mallLabel(deal)}
              </span>
              {brandChip}
              <ShippingBadge fee={deal.shippingFee} />
            </div>
            <h3 className="truncate text-sm font-medium text-gray-900">
              {displayTitle(deal.title)}
            </h3>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-brand">
                {formatWon(deal.currentPrice)}
              </span>
              {strikePrice > deal.currentPrice && (
                <span className="text-[11px] text-gray-400 line-through">
                  {formatWon(strikePrice)}
                </span>
              )}
              {saving > 0 && (
                <span className="text-[11px] font-semibold text-blue-600">
                  {formatWon(saving).replace("원", "")}원↓
                </span>
              )}
              {deal.unitPrice && (
                <span className="text-[11px] text-gray-400">· {deal.unitPrice}</span>
              )}
            </div>
            {!isCurated && score.score !== null && verdict && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px]">
                <span className="font-extrabold text-gray-700">DROP {score.score}</span>
                <span className="text-gray-500">
                  {verdict.icon} {verdict.title}
                </span>
              </div>
            )}
          </div>
        </Link>
        <div className="flex flex-shrink-0 flex-col items-stretch gap-1.5">
          <div className="flex gap-1.5">
            <LikeButton productId={deal.productId} initialCount={deal.likeCount} size="sm" />
            <ShareButton path={`/price/${deal.productId}`} title={deal.title} compact />
          </div>
          {ended ? (
            <span className="block rounded-lg bg-gray-200 px-3 py-1 text-center text-xs font-bold text-gray-500">
              종료됨
            </span>
          ) : (
            <BuyButton productId={deal.productId} href={deal.affiliateUrl} compact>
              구매 →
            </BuyButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition ${
        ended ? "opacity-70" : "hover:shadow-md"
      }`}
    >
      {/* 클릭 → 상세(그래프) */}
      <Link href={`/price/${deal.productId}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <SafeImage
            src={deal.imageUrl}
            alt={deal.title}
            className={`h-full w-full object-cover transition ${
              ended ? "grayscale" : "group-hover:scale-105"
            }`}
          />
          {ended && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="rounded-md bg-gray-900/80 px-2 py-1 text-xs font-bold text-white">
                ⏱️ 종료된 딜
              </span>
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {isCurated ? curatedBadge : <StatusBadge rate={rate} isLowestEver={deal.isLowestEver} trackedDays={trackedDays} basis={basis} />}
            {deal.isPriceError && <PriceErrorBadge />}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3 pb-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
              {mallLabel(deal)}
            </span>
            {brandChip}
            <ShippingBadge fee={deal.shippingFee} />
          </div>

          <h3 className="line-clamp-2 text-sm font-medium text-gray-900">
            {displayTitle(deal.title)}
          </h3>

          <div className="mt-auto pt-1">
            {strikePrice > deal.currentPrice && (
              <div className="text-xs text-gray-400 line-through">
                {formatWon(strikePrice)}
              </div>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-brand">
                {formatWon(deal.currentPrice)}
              </span>
              {saving > 0 && (
                <span className="text-[11px] font-semibold text-blue-600">
                  {formatWon(saving).replace("원", "")}원↓
                </span>
              )}
            </div>
            {deal.unitPrice && (
              <div className="text-[11px] text-gray-400">{deal.unitPrice}</div>
            )}
            {!isCurated && score.score !== null && verdict && (
              <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                <span className="rounded bg-gray-900 px-1.5 py-0.5 font-extrabold text-white">
                  DROP {score.score}
                </span>
                <span className="font-bold text-gray-600">
                  {verdict.icon} {verdict.title}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* 액션 행: 좋아요 + 바로구매 (상세 링크와 분리) */}
      <div className="flex items-center gap-2 px-3 pb-3">
        <LikeButton
          productId={deal.productId}
          initialCount={deal.likeCount}
          size="sm"
        />
        <ShareButton path={`/price/${deal.productId}`} title={deal.title} compact />
        <div className="flex-1">
          {ended ? (
            <span className="block rounded-lg bg-gray-200 py-1.5 text-center text-xs font-bold text-gray-500">
              종료됨
            </span>
          ) : (
            <BuyButton productId={deal.productId} href={deal.affiliateUrl} compact>
              현재 가격 확인 →
            </BuyButton>
          )}
        </div>
      </div>
    </div>
  );
}
