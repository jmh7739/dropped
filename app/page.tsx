import { getDeals, SortKey } from "@/lib/deals";
import { isSupabaseConfigured } from "@/lib/supabase";
import DealGrid from "@/components/DealGrid";
import CategoryTabs from "@/components/CategoryTabs";
import SortTabs from "@/components/SortTabs";
import FlightsView from "@/components/FlightsView";
import AuctionView from "@/components/AuctionView";
import GoldboxSection from "@/components/GoldboxSection";
import GoldboxBanner from "@/components/GoldboxBanner";
import TopDrops from "@/components/TopDrops";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import { AuctionScope, AuctionSort } from "@/lib/auction";
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
    region?: string;
    o?: string;
    d?: string;
    ac?: string;
    as?: string;
    q?: string;
    page?: string;
  };
}) {
  // URL 파라미터는 신뢰하지 않고 화이트리스트로 검증
  const validSlugs = new Set(CATEGORIES.map((c) => c.slug));
  const category = validSlugs.has(searchParams.category ?? "")
    ? searchParams.category
    : undefined;
  const validDealSorts: SortKey[] = [
    "discount",
    "discount_asc",
    "price_asc",
    "price_desc",
    "recent",
  ];
  const sort: SortKey = validDealSorts.includes(searchParams.sort as SortKey)
    ? (searchParams.sort as SortKey)
    : "discount";
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

  // ── 항공권 탭: 지역 → 노선 → 날짜 드릴다운 ──
  if (isFlight) {
    const region = (searchParams.region ?? "").slice(0, 20) || undefined;
    const o = (searchParams.o ?? "").slice(0, 30) || undefined;
    const d = (searchParams.d ?? "").slice(0, 30) || undefined;
    return (
      <div>
        {demoBanner}
        <h1 className="mb-4 text-xl font-extrabold">✈️ 항공권 특가</h1>
        <FlightsView region={region} origin={o} destination={d} />
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
    const validSorts: AuctionSort[] = [
      "discount_desc",
      "discount_asc",
      "price_desc",
      "price_asc",
      "recent",
      "oldest",
    ];
    const asort: AuctionSort = validSorts.includes(
      searchParams.as as AuctionSort
    )
      ? (searchParams.as as AuctionSort)
      : "discount_desc";
    return (
      <div>
        {demoBanner}
        <h1 className="mb-4 text-xl font-extrabold">⚖️ 경매 특가</h1>
        <AuctionView scope={ascope} sort={asort} />
      </div>
    );
  }

  // ── 쇼핑 딜 ──
  const allDeals = await getDeals({ category, sort, hotOnly: hot, q });
  const totalPages = Math.max(1, Math.ceil(allDeals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const deals = allDeals.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCount = allDeals.filter((d) => d.status !== "ended").length;

  // 필터 없는 기본 홈 1페이지에서만 상단 TOP 순위 노출 (하락률 순, 종료딜 제외)
  const isDefaultHome = !category && !hot && !q;
  const topDrops =
    isDefaultHome && safePage === 1
      ? [...allDeals]
          .filter((d) => d.status !== "ended")
          .sort(
            (a, b) =>
              (b.discountVsAvg ?? b.discountVsList) -
              (a.discountVsAvg ?? a.discountVsList)
          )
          .slice(0, 8)
      : [];

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

      {topDrops.length > 0 && <TopDrops deals={topDrops} />}

      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="flex items-baseline text-xl font-extrabold">
          <span>{heading}</span>
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

      {/* 쿠팡 골드박스: 필터 없는 전체 화면에서만 하단 노출 */}
      {!category && !hot && !q && (
        <>
          <GoldboxSection />
          <GoldboxBanner />
        </>
      )}
    </div>
  );
}
