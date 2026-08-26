import { getGoldboxDeals } from "@/lib/goldbox";
import { formatWon } from "@/lib/format";
import { ShippingBadge } from "./DiscountBadge";
import BuyButton from "./BuyButton";
import SafeImage from "./SafeImage";

export default async function GoldboxSection() {
  const deals = await getGoldboxDeals();
  if (deals.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-2 flex items-end justify-between">
        <h2 className="text-lg font-extrabold">🛒 쿠팡 핫딜</h2>
        <span className="text-xs text-gray-400">골드박스·특가 모음 · 매일 갱신</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {deals.map((d) => {
          const saving = (d.listPrice ?? d.currentPrice) - d.currentPrice;
          return (
            <div
              key={d.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-amber-200 bg-white transition hover:shadow-md"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <SafeImage
                  src={d.imageUrl}
                  alt={d.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <span className="absolute left-2 top-2 rounded-md bg-amber-400 px-1.5 py-0.5 text-xs font-bold text-amber-950">
                  {d.label || "🎁 골드박스"}
                </span>
                {d.discountRate ? (
                  <span className="absolute right-2 top-2 rounded-md bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
                    🔻{d.discountRate}%
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-1 p-3 pb-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                    쿠팡
                  </span>
                  {d.category && <span>{d.category}</span>}
                  <ShippingBadge fee={d.shippingFee} />
                </div>
                <h3 className="line-clamp-2 text-sm font-medium text-gray-900">
                  {d.title}
                </h3>
                <div className="mt-auto pt-1">
                  {d.listPrice ? (
                    <div className="text-xs text-gray-400 line-through">
                      {formatWon(d.listPrice)}
                    </div>
                  ) : null}
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-extrabold text-brand">
                      {formatWon(d.currentPrice)}
                    </span>
                    {saving > 0 && (
                      <span className="text-[11px] font-semibold text-blue-600">
                        {formatWon(saving).replace("원", "")}원↓
                      </span>
                    )}
                  </div>
                  {d.unitPrice && (
                    <div className="text-[11px] text-gray-400">{d.unitPrice}</div>
                  )}
                </div>
              </div>

              <div className="px-3 pb-3">
                <BuyButton productId={d.id} href={d.affiliateUrl} compact track={false}>
                  바로구매 →
                </BuyButton>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
