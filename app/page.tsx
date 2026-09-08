import type { Metadata } from "next";
import Link from "next/link";
import { getDeals, getLastPriceUpdate, diversifyTop, SortKey, PriceStatusKey } from "@/lib/deals";
import { timeAgo } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase";
import { hotDealScore, limitHealthDeals, dropScore } from "@/lib/dropMetrics";
import DealGrid from "@/components/DealGrid";
import SortDropdown from "@/components/SortDropdown";
import TravelView, { TravelTab } from "@/components/TravelView";
import AuctionView from "@/components/AuctionView";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import HotdealTabs from "@/components/HotdealTabs";
import TopDrops from "@/components/TopDrops";
import CuratedSection from "@/components/CuratedSection";
import GoldboxBanner from "@/components/GoldboxBanner";
import { AuctionScope, AuctionSort } from "@/lib/auction";
import { PAGE_SIZE } from "@/lib/nav";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: {
    category?: string;
    q?: string;
    sort?: string;
    ps?: string;
    scope?: string;
    page?: string;
    hot?: string;
    sec?: string;
    cc?: string;
    cs?: string;
    bs?: string;
  };
}): Promise<Metadata> {
  const cat = CATEGORIES.find((c) => c.slug === searchParams.category);
  const q = (searchParams.q ?? "").slice(0, 50).trim();
  const hasFilter =
    searchParams.sort !== undefined ||
    searchParams.ps !== undefined ||
    searchParams.scope !== undefined ||
    searchParams.page !== undefined ||
    searchParams.hot !== undefined ||
    searchParams.bs !== undefined ||
    searchParams.cc !== undefined ||
    searchParams.cs !== undefined;
  if (q)
    return {
      title: `"${q}" 최저가·특가 검색`,
      robots: { index: false, follow: true },
    };
  if (hasFilter)
    return { robots: { index: false, follow: true } };
  if (searchParams.sec === "best")
    return {
      title: "베스트딜 — 국내몰 인기 할인",
      description:
        "국내 온라인몰에서 지금 잘 팔리는 할인 상품을 모았습니다. 원가 대비 실질 할인율로 비교하세요.",
      alternates: { canonical: "/?sec=best" },
    };
  if (cat?.dealType === "flight")
    return {
      title: "여행 특가 — 항공권 최저가·숙소",
      description:
        "한국 출발 항공권 최저가를 노선·날짜별로. 평소보다 떨어진 여행 특가를 한눈에.",
      alternates: { canonical: "/?category=flight" },
    };
  if (cat?.dealType === "auction")
    return {
      title: "경매 특가 — 법원경매 부동산·자동차",
      description:
        "법원경매(온비드) 부동산·자동차를 감정가 대비 하락률 순으로. 유찰로 싸진 물건만.",
      alternates: { canonical: "/?category=auction" },
    };
  if (cat && cat.dealType === "shopping")
    return {
      title: `${cat.name} 최저가·특가·핫딜`,
      description: `${cat.name} 카테고리에서 평소 판매가보다 진짜 싸진 것만 모았어요. 가격 추적으로 지금이 살 때인지 알려드립니다.`,
      alternates: { canonical: `/category/${cat.slug}` },
    };
  return {};
}

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
    ps?: string;
    scope?: string;
    page?: string;
    sec?: string;
    cc?: string;
    cs?: string;
    bs?: string;
  };
}) {
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
  const showEnded = searchParams.se === "1";
  const q = (searchParams.q ?? "").slice(0, 100);
  const validPs = new Set<PriceStatusKey>(["plunge", "lowest", "bigdrop", "fresh"]);
  const ps = validPs.has(searchParams.ps as PriceStatusKey)
    ? (searchParams.ps as PriceStatusKey)
    : undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const activeCat = CATEGORIES.find((c) => c.slug === category);
  const isFlight = activeCat?.dealType === "flight";
  const isAuction = activeCat?.dealType === "auction";
  const sec = searchParams.sec === "best" ? ("best" as const) : ("drop" as const);
  const cc = validSlugs.has(searchParams.cc ?? "") ? searchParams.cc : undefined;
  const cs: SortKey = validDealSorts.includes(searchParams.cs as SortKey)
    ? (searchParams.cs as SortKey)
    : "recent";
  const bestScope =
    searchParams.bs === "domestic" || searchParams.bs === "overseas"
      ? searchParams.bs
      : undefined;

  const demoBanner = !isSupabaseConfigured && (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
      ⚙️ 데이터 미연결: <code>.env.local</code>에 Supabase 키를 넣고 크롤러가
      수집하면 실데이터가 표시됩니다. (연결 전에는 비어 있습니다)
    </div>
  );

  // ── 여행 탭 ──
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

  // ── 경매 탭 ──
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
  const catOptions = [
    { key: "", label: "전체 카테고리" },
    ...CATEGORIES.filter((c) => c.dealType === "shopping").map((c) => ({
      key: c.slug,
      label: c.name,
    })),
  ];

  // 급락딜/베스트딜 탭 공통 파라미터
  const allParams: Record<string, string> = {};
  if (category) allParams.category = category;
  if (sort !== "discount") allParams.sort = sort;
  if (hot) allParams.hot = "1";
  if (q) allParams.q = q;
  if (showEnded) allParams.se = "1";
  if (ps) allParams.ps = ps;
  if (bestScope) allParams.bs = bestScope;

  const bestParams: Record<string, string> = { sec: "best" };
  if (cc) bestParams.cc = cc;
  if (cs !== "recent") bestParams.cs = cs;

  const fetched =
    sec === "drop"
      ? await getDeals({ category, sort, hotOnly: hot, q, priceStatus: ps })
      : [];
  const lastUpdate = sec === "drop" ? await getLastPriceUpdate() : null;

  // 베스트 딜: 충분한 추적 + confidence 통과 상품만 (검색/필터 없을 때)
  let bestCandidates =
    sec === "drop" && !q && !ps
      ? fetched
          .filter((d) => {
            if ((d.trackedDays ?? 0) < 10) return false;
            const s = dropScore(d);
            return s.tone === "hot" || s.tone === "good" || s.tone === "ok";
          })
          .sort((a, b) => hotDealScore(b) - hotDealScore(a))
      : [];
  if (bestScope === "domestic")
    bestCandidates = bestCandidates.filter((d) => d.platform !== "aliexpress");
  if (bestScope === "overseas")
    bestCandidates = bestCandidates.filter((d) => d.platform === "aliexpress");
  const bestDeals = diversifyTop(limitHealthDeals(bestCandidates, 1), 8);
  const bestIds = new Set(bestDeals.map((d) => d.id));

  // 최근 가격 변동: 베스트딜과 중복 제거
  const listDeals = fetched.filter((d) => !bestIds.has(d.id));
  const totalPages = Math.max(1, Math.ceil(listDeals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedList = listDeals.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const listCount = listDeals.length;

  const sortOptions = [
    { key: "discount", label: "할인율" },
    { key: "popular", label: "인기" },
    { key: "recent", label: "최신" },
    { key: "price_asc", label: "낮은 가격" },
  ];
  const hrefFor = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { ...allParams, ...next };
    Object.entries(merged).forEach(([key, value]) => {
      if (value) sp.set(key, value);
    });
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div>
      {demoBanner}

      <div className="mb-5">
        <SearchBar initial={q} />
      </div>

      <HotdealTabs
        sec={sec}
        drop={{ category, sort, hot, q, showEnded, ps }}
        best={{ cc, cs: cs !== "recent" ? cs : undefined }}
      />

      {sec === "drop" ? (
        <>
          {/* 베스트 딜 — 충분한 추적 + 신뢰도 통과 상품만 */}
          {bestDeals.length > 0 && (
            <TopDrops
              deals={bestDeals}
              header={
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-gray-900">베스트 딜</h2>
                  <div className="flex gap-1.5">
                    {([
                      { key: "", label: "전체" },
                      { key: "domestic", label: "국내" },
                      { key: "overseas", label: "해외" },
                    ] as const).map((tab) => (
                      <Link
                        key={tab.key}
                        href={hrefFor({ bs: tab.key || undefined })}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          (bestScope ?? "") === tab.key
                            ? "bg-gray-900 text-white"
                            : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {tab.label}
                      </Link>
                    ))}
                  </div>
                </div>
              }
            />
          )}

          <GoldboxBanner />

          {/* 최근 가격 변동 — 전체 목록 */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-baseline text-lg font-extrabold text-gray-900">
              <span>{q ? `"${q}" 검색 결과` : activeCat ? activeCat.name : "최근 가격 변동"}</span>
              <span className="ml-2 text-sm font-normal text-gray-400">{listCount}개</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <SortDropdown
                options={catOptions}
                value={category ?? ""}
                param="category"
                params={allParams}
              />
              <SortDropdown
                options={sortOptions}
                value={sort}
                param="sort"
                params={allParams}
              />
            </div>
          </div>
          <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
            <p>가격을 추적해 평소보다 진짜 떨어진 것만</p>
            {lastUpdate && (
              <p className="flex items-center gap-1.5 whitespace-nowrap" suppressHydrationWarning>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                가격 확인 {timeAgo(lastUpdate)}
              </p>
            )}
          </div>

          {paginatedList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
              {q ? "검색 결과가 없습니다." : "아직 이 카테고리에 감지된 특가가 없습니다."}
            </div>
          ) : (
            <>
              <DealGrid deals={paginatedList} />
              <Pagination
                page={safePage}
                totalPages={totalPages}
                base={{
                  category,
                  sort,
                  hot,
                  q,
                  ...(showEnded ? { se: "1" } : {}),
                  ...(ps ? { ps } : {}),
                  ...(bestScope ? { bs: bestScope } : {}),
                }}
              />
            </>
          )}
        </>
      ) : (
        <CuratedSection
          cc={cc}
          cs={cs}
          catOptions={catOptions}
          params={bestParams}
        />
      )}
    </div>
  );
}
