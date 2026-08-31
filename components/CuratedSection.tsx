import { getCuratedDeals } from "@/lib/deals";
import DealGrid from "./DealGrid";

// 국내몰 추천 특가 — 링크프라이스 MD 큐레이션(가격추적 급락딜과 구분).
//   메인 핫딜과 동일한 카드(상세페이지·좋아요·공유·바로구매) 재사용, 인기순 정렬.
export default async function CuratedSection() {
  const deals = await getCuratedDeals("popular");
  if (deals.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-1">
        <h2 className="text-lg font-extrabold">🇰🇷 국내몰 추천 특가</h2>
        <span className="text-xs text-gray-400">
          제휴사 MD 추천 · 가격추적 급락딜과 별개
        </span>
      </div>

      <DealGrid deals={deals} />

      <p className="mt-2 text-[11px] text-gray-400">
        제휴사가 추천한 특가로, 가격 하락 여부는 별도 검증하지 않았습니다. 구매 전
        판매 페이지에서 최종 가격을 확인하세요.
      </p>
    </section>
  );
}
