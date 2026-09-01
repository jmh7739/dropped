import { getCuratedDeals, SortKey } from "@/lib/deals";
import DealGrid from "./DealGrid";
import SortDropdown from "./SortDropdown";

// 국내몰 추천 특가 — 상단 급락딜과 독립된 카테고리(cc)·정렬(cs) 드롭다운.
const CURATED_SORTS = [
  { key: "discount", label: "할인률 높은순" },
  { key: "popular", label: "인기순" },
  { key: "price_asc", label: "가격 낮은순" },
  { key: "price_desc", label: "가격 높은순" },
  { key: "recent", label: "최신순" },
];

export default async function CuratedSection({
  cc,
  cs = "recent",
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
  let deals = cc ? all.filter((d) => d.categorySlug === cc) : all;

  // 딜 신호(특가·할인·1+1 등) 있는 것 우선 — 기본(인기순)일 때만 재배치
  if (cs === "popular") {
    const sig = (t: string) =>
      /특가|할인|세일|1\+1|증정|한정|기획전|단독|무료배송|초특가|최저가|사은품/.test(t);
    deals = [...deals.filter((d) => sig(d.title)), ...deals.filter((d) => !sig(d.title))];
  }

  // 전체 보기: 한 카테고리가 도배하지 않게 카테고리당 상한(12개)
  if (!cc) {
    const perCat = new Map<string, number>();
    deals = deals.filter((d) => {
      const n = perCat.get(d.categorySlug) ?? 0;
      if (n >= 12) return false;
      perCat.set(d.categorySlug, n + 1);
      return true;
    });
  }

  return (
    <section>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold">🛒 베스트딜</h2>
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
      <p className="mb-3 text-xs text-gray-400">
        국내몰에서 지금 잘 팔리는 할인 상품 (원가 대비)
      </p>

      {deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
          이 카테고리엔 베스트딜이 없어요.
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
