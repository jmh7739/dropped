/**
 * 쿠팡 골드박스(쿠팡 자체 데일리 특가) 전체보기 배너.
 * 개별 상품 데이터가 아니라 쿠팡 골드박스 페이지로 보내는 제휴 링크 하나.
 * → 우리가 '평소보다 싸다'고 검증한 딜이 아니라, 쿠팡이 매일 지정하는 특가임을
 *   명확히 구분해 표기한다. (수익: 쿠팡파트너스 제휴)
 */
const GOLDBOX_URL = "https://link.coupang.com/a/gwB6ejaQz6";

export default function GoldboxBanner() {
  return (
    <a
      href={GOLDBOX_URL}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3.5 transition hover:shadow-md"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-2xl">🎁</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold text-amber-950">
              쿠팡 골드박스
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm font-bold text-gray-900">
            쿠팡 오늘의 특가 보기
          </p>
        </div>
      </div>
      <span className="flex-shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-bold text-amber-950">
        보러가기 →
      </span>
    </a>
  );
}
