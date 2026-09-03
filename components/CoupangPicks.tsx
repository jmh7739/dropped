import { COUPANG_PICKS } from "@/lib/coupangPicks";
import SafeImage from "./SafeImage";

/**
 * 손으로 고른 쿠팡 추천 상품 카드. lib/coupangPicks.ts 비면 숨김.
 *   쿠팡 정책상 제휴 고지 문구를 하단에 표기한다.
 */
export default function CoupangPicks() {
  if (COUPANG_PICKS.length === 0) return null;

  return (
    <section className="my-8">
      <h2 className="mb-3 text-lg font-extrabold text-gray-900">🛒 쿠팡 추천</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {COUPANG_PICKS.map((p) => (
          <a
            key={p.url}
            href={p.url}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md"
          >
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              <SafeImage
                src={p.image}
                alt={p.title}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              {p.note && (
                <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-1 text-[11px] font-extrabold text-white shadow-sm">
                  {p.note}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <h3 className="line-clamp-2 text-sm font-medium text-gray-900">
                {p.title}
              </h3>
              <div className="mt-auto flex items-baseline justify-between pt-1">
                {p.price && (
                  <span className="text-base font-extrabold text-brand">
                    {p.price}
                  </span>
                )}
                <span className="text-xs font-bold text-brand">쿠팡 보기 →</span>
              </div>
            </div>
          </a>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-gray-400">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </section>
  );
}
