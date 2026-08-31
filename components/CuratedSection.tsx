import { getCuratedDeals, SortKey } from "@/lib/deals";
import DealGrid from "./DealGrid";
import SortDropdown from "./SortDropdown";

// 국내몰 추천 특가 — 상단 급락딜과 독립된 카테고리(cc)·정렬(cs) 드롭다운.
const CURATED_SORTS = [
  { key: "popular", label: "인기순" },
  { key: "price_asc", label: "가격 낮은순" },
  { key: "price_desc", label: "가격 높은순" },
  { key: "recent", label: "최신순" },
];

export default async function CuratedSection({
  cc,
  cs = "popular",
  catOptions,
  params,
}: {
  cc?: string;
  cs?: SortKey;
  catOptions: { key: string; label: string }[];
  params: Record<string, string>;
}) {
  const all = await getCuratedDeals(cs);
  if (all.length === 0) return null; // 추천 특가가 아예 없으면 섹션 숨김
  const deals = cc ? all.filter((d) => d.categorySlug === cc) : all;

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">🏬 국내몰 추천 특가</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* 하단 전용 카테고리 드롭다운 (독립) */}
          <SortDropdown
            options={catOptions}
            value={cc ?? ""}
            param="cc"
            params={params}
          />
          {/* 하단 전용 정렬 드롭다운 (독립) */}
          <SortDropdown
            options={CURATED_SORTS}
            value={cs}
            param="cs"
            params={params}
          />
        </div>
      </div>

      {deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
          이 카테고리엔 추천 특가가 없어요.
        </div>
      ) : (
        <DealGrid deals={deals} />
      )}

      <p className="mt-2 text-[11px] text-gray-400">
        구매 전 판매 페이지에서 최종 가격을 확인하세요.
      </p>
    </section>
  );
}
