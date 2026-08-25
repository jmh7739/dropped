import { getDeals, SortKey } from "@/lib/deals";
import { isSupabaseConfigured } from "@/lib/supabase";
import DealGrid from "@/components/DealGrid";
import CategoryTabs from "@/components/CategoryTabs";
import SortTabs from "@/components/SortTabs";
import FlightsView from "@/components/FlightsView";
import AuctionView from "@/components/AuctionView";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import { FlightScope } from "@/lib/flights";
import { AuctionScope } from "@/lib/auction";
import { PAGE_SIZE } from "@/lib/nav";
import { CATEGORIES } from "@/lib/types";

// ISR: 10분마다 정적 페이지 재생성
export const revalidate = 600;

export default async function Home({
  searchParams,
}: {
  searchParams: {
    category?: string;
    sort?: string;
    hot?: string;
    fc?: string;
    ac?: string;
    q?: string;
    page?: string;
  };
}) {
  // URL 파라미터는 신뢰하지 않고 화이트리스트로 검증
  const validSlugs = new Set(CATEGORIES.map((c) => c.slug));
  const category = validSlugs.has(searchParams.category ?? "")
    ? searchParams.category
    : undefined;
  const sort: SortKey = searchParams.sort === "recent" ? "recent" : "discount";
  const hot = searchParams.hot === "1";
  const q = (searchParams.q ?? "").slice(0, 100);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const activeCat = CATEGORIES.find((c) => c.slug === category);
  const isFlight = activeCat?.dealType === "flight";
  const isAuction = activeCat?.dealType === "auction";

  const demoBanner = !isSupabaseConfigured && (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
      ⚙️ 데이터 미연결: <code>.env.local</code>에 Supabase 키를 넣고 크롤러가
      수집하면 실데이터가 표시됩니다. (연결 전에는 비어 있습니다)
    </div>
  );

  // ── 항공권 탭: 별도 뷰(국내선/국제선 필터) ──
  if (isFlight) {
    const scope: FlightScope =
      searchParams.fc === "domestic"
        ? "domestic"
        : searchParams.fc === "intl"
          ? "intl"
          : "all";
    return (
      <div>
        {demoBanner}
        <h1 className="mb-1 text-xl font-extrabold">✈️ 항공권 특가</h1>
        <div className="mb-4">
          <CategoryTabs active={category} sort={sort} hot={hot} />
        </div>
        <FlightsView scope={scope} />
      </div>
    );
  }

  // ── 경매 탭: 부동산/자동차 필터 ──
  if (isAuction) {
    const ascope: AuctionScope =
      searchParams.ac === "부동산"
        ? "부동산"
        : searchParams.ac === "자동차"
          ? "자동차"
          : "all";
    return (
      <div>
        {demoBanner}
        <h1 className="mb-1 text-xl font-extrabold">⚖️ 경매 특가</h1>
        <div className="mb-4">
          <CategoryTabs active={category} sort={sort} hot={hot} />
        </div>
        <AuctionView scope={ascope} />
      </div>
    );
  }

  // ── 쇼핑 딜 ──
  const allDeals = await getDeals({ category, sort, hotOnly: hot, q });
  const totalPages = Math.max(1, Math.ceil(allDeals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const deals = allDeals.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCount = allDeals.filter((d) => d.status !== "ended").length;

  const heading = q
    ? `"${q}" 검색 결과`
    : hot
      ? "🔥 인기딜"
      : activeCat
        ? activeCat.name
        : "🔥 오늘의 급락 특가";

  return (
    <div>
      {demoBanner}

      <div className="mb-3">
        <SearchBar initial={q} />
      </div>

      <div className="mb-1 flex items-end justify-between">
        <h1 className="text-xl font-extrabold">
          {heading}
          <span className="ml-2 text-sm font-normal text-gray-400">
            {activeCount}개
          </span>
        </h1>
        <SortTabs category={category} sort={sort} hot={hot} q={q} />
      </div>

      <div className="mb-4">
        <CategoryTabs active={category} sort={sort} hot={hot} q={q} />
      </div>

      {deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
          {q ? "검색 결과가 없습니다." : "아직 이 카테고리에 감지된 특가가 없습니다."}
        </div>
      ) : (
        <>
          <DealGrid deals={deals} />
          <Pagination
            page={safePage}
            totalPages={totalPages}
            base={{ category, sort, hot, q }}
          />
        </>
      )}
    </div>
  );
}
