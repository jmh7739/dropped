import Link from "next/link";
import { Deal, mallLabel } from "@/lib/types";
import { formatWon, headlineDiscount, displayTitle } from "@/lib/format";
import { dropBasis, dropScore, reliabilityLabel } from "@/lib/dropMetrics";
import { StatusBadge } from "./DiscountBadge";
import SafeImage from "./SafeImage";

export default function TopDrops({
  deals,
  header,
}: {
  deals: Deal[];
  header?: React.ReactNode;
}) {
  if (!deals.length) return null;

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <section className="mb-6">
      {header}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {deals.map((d, i) => {
          const { rate, basis } = headlineDiscount(d);
          const score = dropScore(d);
          const curatedDisc =
            d.isCurated && d.listPrice > d.currentPrice
              ? Math.round(((d.listPrice - d.currentPrice) / d.listPrice) * 100)
              : 0;
          return (
            <Link
              key={d.id}
              href={`/price/${d.productId}`}
              className="group relative flex w-40 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md"
            >
              <span className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/85 text-sm font-extrabold text-white">
                {i < 3 ? medal[i] : i + 1}
              </span>
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <SafeImage
                  src={d.imageUrl}
                  alt={d.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <span className="absolute right-2 top-2">
                  {d.isCurated ? (
                    curatedDisc > 0 && (
                      <span className="rounded-md bg-brand px-2 py-1 text-[11px] font-extrabold text-white shadow-sm">
                        🔻{curatedDisc}%
                      </span>
                    )
                  ) : (
                    <StatusBadge rate={rate} isLowestEver={d.isLowestEver} trackedDays={d.trackedDays} basis={basis} />
                  )}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                <span className="text-[10px] text-gray-400">{mallLabel(d)}</span>
                <h3 className="line-clamp-2 text-xs font-medium text-gray-800">
                  {displayTitle(d.title, 40)}
                </h3>
                {!d.isCurated && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-extrabold text-red-600">
                      {score.score !== null ? `DROP ${score.score}` : "데이터 부족"}
                    </span>
                    {rate > 0 && (
                      <span className="text-[10px] font-bold text-gray-600">
                        {basis === "평균" ? "평소" : "정가"} -{Math.round(rate)}%
                      </span>
                    )}
                  </div>
                )}
                <span className="mt-auto pt-1 text-base font-extrabold text-brand">
                  {formatWon(d.currentPrice)}
                </span>
                {!d.isCurated && (
                  <span className="text-[10px] text-gray-400">
                    {reliabilityLabel(d)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
