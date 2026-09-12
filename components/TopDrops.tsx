import Link from "next/link";
import { Deal, mallLabel } from "@/lib/types";
import { formatWon, headlineDiscount, displayTitle } from "@/lib/format";
import { StatusBadge } from "./DiscountBadge";
import { trackingStage } from "@/lib/dropMetrics";
import SafeImage from "./SafeImage";

/**
 * 상단 '지금 가장 많이 떨어진' 가로 스트립. 정보는 핵심만:
 *   쇼핑몰 · 상품명(2줄) · 현재가 · 하락률. 순위 메달은 약하게.
 *   배지로 '정가 대비(큐레이션)'와 '평소 대비(가격이력)'를 구분해 혼동 방지.
 */
export default function TopDrops({
  deals,
  header,
}: {
  deals: Deal[];
  header?: React.ReactNode;
}) {
  if (!deals.length) return null;

  return (
    <section className="mb-6">
      {header}
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {deals.map((d, i) => {
          const { rate, basis } = headlineDiscount(d);
          const curatedDisc =
            d.isCurated && d.listPrice > d.currentPrice
              ? Math.round(((d.listPrice - d.currentPrice) / d.listPrice) * 100)
              : 0;
          const stage = trackingStage(d.trackedDays);
          return (
            <Link
              key={d.id}
              href={`/price/${d.productId}`}
              className="group relative flex w-36 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md"
            >
              <span className="absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900/55 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <SafeImage
                  src={d.imageUrl}
                  alt={d.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <span className="absolute right-1.5 top-1.5">
                  {d.isCurated ? (
                    curatedDisc > 0 && (
                      <span className="rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
                        정가 -{curatedDisc}%
                      </span>
                    )
                  ) : (
                    <StatusBadge rate={rate} isLowestEver={d.isLowestEver} trackedDays={d.trackedDays} basis={basis} />
                  )}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                <span className="text-[10px] text-gray-400">{mallLabel(d)}</span>
                <span className="text-[10px] font-medium text-gray-500">
                  {d.isCurated ? "가격 이력 수집 중" : `${stage.icon} ${d.trackedDays ? `추적 ${d.trackedDays}일` : "추적 시작"}`}
                </span>
                <h3 className="line-clamp-2 text-xs font-medium text-gray-800">
                  {displayTitle(d.title, 40)}
                </h3>
                <span className="mt-auto pt-1 text-base font-extrabold text-brand">
                  {formatWon(d.currentPrice)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
