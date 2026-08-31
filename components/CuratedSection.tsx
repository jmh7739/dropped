import { getCuratedDeals } from "@/lib/curated";
import { formatWon } from "@/lib/format";
import SafeImage from "./SafeImage";

// 국내몰 추천 특가 — 링크프라이스 MD가 고른 큐레이션 (가격추적 급락딜과 구분)
export default async function CuratedSection() {
  const deals = await getCuratedDeals();
  if (deals.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-1">
        <h2 className="text-lg font-extrabold">🇰🇷 국내몰 추천 특가</h2>
        <span className="text-xs text-gray-400">
          제휴사 MD 추천 · 가격추적 급락딜과 별개
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {deals.map((d) => (
          <a
            key={d.id}
            href={d.affiliateUrl}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md"
          >
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              <SafeImage
                src={d.imageUrl}
                alt={d.title}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              <span className="absolute left-1.5 top-1.5 rounded bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {d.mallName}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-2.5">
              <p className="line-clamp-2 text-xs font-medium leading-snug text-gray-800">
                {d.title}
              </p>
              {d.promoText && (
                <p className="mt-1 line-clamp-1 text-[11px] text-gray-400">
                  {d.promoText}
                </p>
              )}
              <div className="mt-auto pt-2 text-base font-extrabold text-gray-900">
                {formatWon(d.price)}
              </div>
            </div>
          </a>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-gray-400">
        제휴사가 추천한 특가로, 가격 하락 여부는 별도 검증하지 않았습니다. 구매 전
        판매 페이지에서 최종 가격을 확인하세요.
      </p>
    </section>
  );
}
