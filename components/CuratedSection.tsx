import { getCuratedDeals, SortKey } from "@/lib/deals";
import DealGrid from "./DealGrid";

// 국내몰 추천 특가 — 링크프라이스 MD 큐레이션(가격추적 급락딜과 구분).
//   메인 핫딜과 동일한 카드(상세페이지·좋아요·공유·바로구매) 재사용.
//   선택된 카테고리·정렬을 그대로 따름(위 급락딜과 동일 필터).
export default async function CuratedSection({
  category,
  sort = "popular",
}: {
  category?: string;
  sort?: SortKey;
}) {
  const deals = await getCuratedDeals(sort, category);
  if (deals.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-2">
        <h2 className="text-lg font-extrabold">🏬 국내몰 추천 특가</h2>
      </div>

      <DealGrid deals={deals} />

      <p className="mt-2 text-[11px] text-gray-400">
        구매 전 판매 페이지에서 최종 가격을 확인하세요.
      </p>
    </section>
  );
}
