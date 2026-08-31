import Link from "next/link";
import { Deal, mallLabel } from "@/lib/types";
import { formatWon, headlineDiscount } from "@/lib/format";
import { StatusBadge } from "./DiscountBadge";
import SafeImage from "./SafeImage";

/**
 * 상단 "지금 뜨는 특가 TOP N" — 하락률 + 인기(클릭·좋아요) 종합 순위.
 * 종료된 딜은 제외하고(진행중만), 수집(스캔)마다 갱신된다(ISR).
 */
export default function TopDrops({ deals }: { deals: Deal[] }) {
  if (deals.length < 3) return null; // 너무 적으면 순위 무의미 → 숨김

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <section className="mb-6 rounded-2xl border border-brand/20 bg-gradient-to-b from-brand/5 to-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-extrabold text-gray-900">🔥 지금 뜨는 특가 TOP</h2>
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {deals.map((d, i) => {
          const { rate } = headlineDiscount(d);
          return (
            <Link
              key={d.id}
              href={`/deal/${d.id}`}
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
                  <StatusBadge rate={rate} isLowestEver={d.isLowestEver} />
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                <span className="text-[10px] text-gray-400">{mallLabel(d)}</span>
                <h3 className="line-clamp-2 text-xs font-medium text-gray-800">
                  {d.title}
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
