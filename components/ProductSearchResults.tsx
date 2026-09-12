import Link from "next/link";
import { ProductSearchRow } from "@/lib/products";
import { PLATFORM_LABEL, Platform } from "@/lib/types";
import { formatWon } from "@/lib/format";
import SafeImage from "./SafeImage";

/**
 * 검색 결과 — '가격 추적 중인 상품' 카드. 지금 특가가 아니어도, 이력으로
 *   지금 살 만한지(🟢/🟡/🔴) 판정을 달아 상세 가격페이지로 보낸다.
 */
export default function ProductSearchResults({
  rows,
  query,
}: {
  rows: ProductSearchRow[];
  query: string;
}) {
  if (!rows.length) return null;

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-lg font-extrabold text-gray-900">
          🔎 “{query}” 가격 추적 · 지금 살까?
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">
          지금 특가인지와 무관하게, 추적한 가격 이력으로 지금 가격이 살 만한지
          판정해 드려요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/price/${r.id}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md"
          >
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              <SafeImage
                src={r.imageUrl}
                alt={r.title}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              <span
                className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[11px] font-extrabold shadow-sm ${r.verdictCls}`}
              >
                {r.verdictIcon} {r.verdictTitle}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <span className="text-[10px] text-gray-400">
                {r.mallName ??
                  PLATFORM_LABEL[r.platform as Platform] ??
                  r.categoryName}
              </span>
              <h3 className="line-clamp-2 text-sm font-medium text-gray-800">
                {r.title}
              </h3>
              <div className="mt-auto space-y-1 border-t border-gray-100 pt-2 text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-gray-500">현재 최저가</span>
                  <span className="text-base font-extrabold text-brand">{formatWon(r.currentPrice)}</span>
                </div>
                {r.averagePrice != null && <div className="flex justify-between gap-2 text-gray-500"><span>{r.averageLabel}</span><strong className="text-gray-700">{formatWon(r.averagePrice)}</strong></div>}
                <div className="flex justify-between gap-2 text-gray-500"><span>{r.lowestLabel}</span><strong className="text-gray-700">{formatWon(r.lowestPrice)}</strong></div>
                <div className="flex justify-between gap-2 pt-1 font-bold">
                  <span className={r.rate > 0 ? "text-blue-600" : "text-gray-400"}>평균 대비 {r.rate > 0 ? `-${r.rate}%` : "비슷함"}</span>
                  <span className="text-gray-400 group-hover:text-brand">가격 그래프 →</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
