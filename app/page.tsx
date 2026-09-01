import { getDeals, SortKey, PriceStatusKey, PRICE_STATUS } from "@/lib/deals";
import { isSupabaseConfigured } from "@/lib/supabase";
import DealGrid from "@/components/DealGrid";
import PriceStatusChips from "@/components/PriceStatusChips";
import HotdealTabs from "@/components/HotdealTabs";
import SortDropdown from "@/components/SortDropdown";
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

// 딜은 매시간 바뀌므로 항상 최신 데이터로 렌더(정적캐시 스테일 방지).
//   트래픽 늘면 revalidate로 되돌려 캐싱 최적화 가능.
export const dynamic = "force-dynamic";

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
    se?: string;
    ps?: string; // 가격 상태 필터 (급락/최근최저/많이하락/방금)
    cc?: string; // 국내몰 추천 특가 카테고리 (독립)
    cs?: string; // 국내몰 추천 특가 정렬 (독립)
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
    : "recent";
  const hot = searchParams.hot === "1";
  const showEnded = searchParams.se === "1"; // 기본은 종료딜 숨김
  const q = (searchParams.q ?? "").slice(0, 100);
  const validPs = new Set<PriceStatusKey>(["plunge", "lowest", "bigdrop", "fresh"]);
  const ps = validPs.has(searchParams.ps as PriceStatusKey)
    ? (searchParams.ps as PriceStatusKey)
    : undefined;
  // 핫딜 세그먼트: 급락(기본) | 베스트(국내몰 인기)
  const sec: "drop" | "best" = searchParams.sec === "best" ? "best" : "drop";
  // 베스트(국내몰) 독립 카테고리·정렬
  const cc = validSlugs.has(searchParams.cc ?? "") ? searchParams.cc : undefined;
  const cs: SortKey = validDealSorts.includes(searchParams.cs as SortKey)
    ? (searchParams.cs as SortKey)
    : "recent";
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
  const fetched = await getDeals({ category, sort, hotOnly: hot, q, priceStatus: ps });
  // 기본: 종료딜 숨김. 'se=1'(종료딜 보기)일 때만 포함
  const visible = showEnded ? fetched : fetched.filter((d) => d.status !== "ended");
  // 같은 브랜드(제목 첫 단어) 도배 방지 — 최대 2개 (알리 유사상품 반복 완화)
  const brandSeen = new Map<string, number>();
  const allDeals = visible.filter((d) => {
    const key = (d.title.trim().split(/[\s,\[\]()·]+/)[0] || "").toLowerCase();
    const n = brandSeen.get(key) ?? 0;
    if (n >= 2) return false;
    brandSeen.set(key, n + 1);
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(allDeals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const deals = allDeals.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCount = allDeals.filter((d) => d.status !== "ended").length;

  // 필터 없는 기본 홈 1페이지에서만 상단 TOP 순위 노출 (종료딜 제외)
  //   순위 = 하락률 + 인기(클릭·좋아요) 종합 점수. 트래픽 쌓이면 인기 반영↑
  const isDefaultHome = !category && !hot && !q && !ps;
  const popScore = (d: (typeof allDeals)[number]) =>
    (d.discountVsAvg ?? d.discountVsList) + d.clickCount * 2 + d.likeCount * 5;
  const topDrops =
    isDefaultHome && safePage === 1
      ? [...allDeals]
          .filter((d) => d.status !== "ended")
          .sort((a, b) => popScore(b) - popScore(a))
          .slice(0, 8)
      : [];

  const psLabel = ps ? PRICE_STATUS.find((s) => s.key === ps)?.label : undefined;
  const heading = q
    ? `"${q}" 검색 결과`
    : hot
      ? "🔥 인기딜"
      : psLabel
        ? psLabel
        : activeCat
          ? activeCat.name
          : "🔥 오늘의 급락 특가";

  // 드롭다운이 유지할 현재 전체 쿼리(각 드롭다운은 자기 param만 덮어씀 → 위/아래 독립)
  const allParams: Record<string, string> = {};
  if (category) allParams.category = category;
  if (sort !== "recent") allParams.sort = sort;
  if (hot) allParams.hot = "1";
  if (q) allParams.q = q;
  if (showEnded) allParams.se = "1";
  if (ps) allParams.ps = ps;
  if (sec === "best") allParams.sec = "best";
  if (cc) allParams.cc = cc;
  if (cs !== "recent") allParams.cs = cs;
  // 상단 카테고리 드롭다운 옵션 (전체 + 쇼핑 카테고리)
  const catOptions = [
    { key: "", label: "전체 카테고리" },
    ...CATEGORIES.filter((c) => c.dealType === "shopping").map((c) => ({
      key: c.slug,
      label: c.name,
    })),
  ];

  return (
    <div>
      {demoBanner}

      <div className="mb-3">
        <SearchBar initial={q} />
      </div>

      {/* 핫딜 세그먼트: 📉 급락(가격 하락 증명) | 🛒 베스트(국내몰 인기) */}
      <HotdealTabs
        sec={sec}
        drop={{ category, sort, hot, q, showEnded, ps }}
        best={{ cc, cs }}
      />

      {sec === "best" ? (
        /* ── 🛒 베스트: 국내몰 인기 세일 (원가 대비 할인율) ── */
        <CuratedSection cc={cc} cs={cs} catOptions={catOptions} params={allParams} />
      ) : (
        /* ── 📉 급락: 가격 추적으로 평소보다 떨어진 것 ── */
        <>
          {topDrops.length > 0 && <TopDrops deals={topDrops} />}

          {/* 쿠팡 골드박스 배너: 상단 TOP 바로 아래(잘 보이는 자리) */}
          {isDefaultHome && <GoldboxBanner />}

          {/* 가격 상태 필터 — 상품종류보다 앞. "얼마나 싼가"로 거른다 */}
          {!q && !hot && (
            <PriceStatusChips
              active={ps}
              base={{ category, sort, hot, q, showEnded, cc, cs }}
            />
          )}

          <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="flex items-baseline text-xl font-extrabold">
              <span>{heading}</span>
              <span className="ml-2 text-sm font-normal text-gray-400">
                {activeCount}개
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <SortDropdown
                options={catOptions}
                value={category ?? ""}
                param="category"
                params={allParams}
              />
              <SortTabs
                category={category}
                sort={sort}
                hot={hot}
                q={q}
                showEnded={showEnded}
                ps={ps}
                cc={cc}
                cs={cs}
              />
            </div>
          </div>
          <p className="mb-3 text-xs text-gray-400">
            가격을 추적해 평소보다 진짜 떨어진 것만
          </p>

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
                base={{ category, sort, hot, q, ...(showEnded ? { se: "1" } : {}), ...(ps ? { ps } : {}) }}
              />
            </>
          )}

          {isDefaultHome && <GoldboxSection />}
        </>
      )}
    </div>
  );
}
