import { getDeals, SortKey } from "@/lib/deals";
import { isSupabaseConfigured } from "@/lib/supabase";
import DealGrid from "@/components/DealGrid";
import CategoryTabs from "@/components/CategoryTabs";
import SortTabs from "@/components/SortTabs";
import TravelView, { TravelTab } from "@/components/TravelView";
import AuctionView from "@/components/AuctionView";
import GoldboxSection from "@/components/GoldboxSection";
import CuratedSection from "@/components/CuratedSection";
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
    tt?: string;
    ac?: string;
    as?: string;
    q?: string;
    he?: string;
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
    "popular",
    "discount_asc",
    "price_asc",
    "price_desc",
    "recent",
  ];
  const sort: SortKey = validDealSorts.includes(searchParams.sort as SortKey)
    ? (searchParams.sort as SortKey)
    : "discount";
  const hot = searchParams.hot === "1";
  const hideEnded = searchParams.he === "1";
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

  // ── 여행 탭: 항공권 / 숙소 / 여행딜 (항공권은 지역→노선→날짜 드릴다운) ──
  if (isFlight) {
    const region = (searchParams.region ?? "").slice(0, 20) || undefined;
    const o = (searchParams.o ?? "").slice(0, 30) || undefined;
    const d = (searchParams.d ?? "").slice(0, 30) || undefined;
    const travelTab: TravelTab =
      searchParams.tt === "stay" ? "stay" : searchParams.tt === "deal" ? "deal" : "flight";
    return (
      <div>
        {demoBanner}
        <h1 className="mb-4 text-xl font-extrabold">🧳 여행 특가</h1>
        <TravelView tab={travelTab} region={region} origin={o} destination={d} />
      </div>
    );
  }

  // ── 경매 탭: 부동산/자동차 필터 ──
  if (isAuction) {
    const ascope: AuctionScope =
      searchParams.ac === "자동차" ? "자동차" : "부동산";
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
  const fetched = await getDeals({ category, sort, hotOnly: hot, q });
  // '종료딜 숨기기' 체크 시 종료된 딜 제외
  const allDeals = hideEnded ? fetched.filter((d) => d.status !== "ended") : fetched;
  const totalPages = Math.max(1, Math.ceil(allDeals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const deals = allDeals.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCount = allDeals.filter((d) => d.status !== "ended").length;

  // 필터 없는 기본 홈 1페이지에서만 상단 TOP 순위 노출 (종료딜 제외)
  //   순위 = 하락률 + 인기(클릭·좋아요) 종합 점수. 트래픽 쌓이면 인기 반영↑
  const isDefaultHome = !category && !hot && !q;
  const popScore = (d: (typeof allDeals)[number]) =>
    (d.discountVsAvg ?? d.discountVsList) + d.clickCount * 2 + d.likeCount * 5;
  const topDrops =
    isDefaultHome && safePage === 1
      ? [...allDeals]
          .filter((d) => d.status !== "ended")
          .sort((a, b) => popScore(b) - popScore(a))
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

      {/* 쿠팡 골드박스 배너: 상단 TOP 바로 아래(잘 보이는 자리) */}
      {isDefaultHome && <GoldboxBanner />}

      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="flex items-baseline text-xl font-extrabold">
          <span>{heading}</span>
          <span className="ml-2 text-sm font-normal text-gray-400">
            {activeCount}개
          </span>
        </h1>
        <SortTabs category={category} sort={sort} hot={hot} q={q} hideEnded={hideEnded} />
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
            base={{ category, sort, hot, q, ...(hideEnded ? { he: "1" } : {}) }}
          />
        </>
      )}

      {/* 국내몰 추천 특가(리얼핫딜 MD 큐레이션) + 쿠팡 골드박스는 하단 유지 */}
      {isDefaultHome && <CuratedSection />}
      {isDefaultHome && <GoldboxSection />}
    </div>
  );
}
