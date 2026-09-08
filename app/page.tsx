import type { Metadata } from "next";
import Link from "next/link";
import { getDeals, getCuratedDeals, getLastPriceUpdate, diversifyTop, SortKey, PriceStatusKey, PRICE_STATUS } from "@/lib/deals";
import { timeAgo } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase";
import { hotDealScore, limitHealthDeals } from "@/lib/dropMetrics";
import DealCard from "@/components/DealCard";
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
  const scope =
    searchParams.scope === "domestic" || searchParams.scope === "overseas"
      ? searchParams.scope
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
  if (scope) allParams.scope = scope;

  const bestParams: Record<string, string> = { sec: "best" };
  if (cc) bestParams.cc = cc;
  if (cs !== "recent") bestParams.cs = cs;

  // sec=best일 때는 급락딜 fetch 불필요
  const fetched =
    sec === "drop"
      ? await getDeals({ category, sort, hotOnly: hot, q, priceStatus: ps, scope })
      : [];
  const lastUpdate = sec === "drop" ? await getLastPriceUpdate() : null;

  const allDeals = fetched;
  const totalPages = Math.max(1, Math.ceil(allDeals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const deals = allDeals.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCount = allDeals.length;

  // TopDrops: 추적 7일 이상 + 다양성 확보 (검색/필터 없을 때만)
  const topDeals =
    sec === "drop" && !q && !ps
      ? diversifyTop(
          limitHealthDeals(
            allDeals
              .filter((d) => (d.trackedDays ?? 0) >= 7)
              .sort((a, b) => hotDealScore(b) - hotDealScore(a)),
            1
          ),
          8
        )
      : [];

  // 국내 급락: TOP과 겹치지 않는 국내 딜
  const topIds = new Set(topDeals.map((d) => d.id));
  const domesticDropDeals =
    sec === "drop" && !q && !ps && !scope
      ? allDeals
          .filter(
            (d) =>
              d.platform !== "aliexpress" &&
              (d.trackedDays ?? 0) >= 7 &&
              !topIds.has(d.id)
          )
          .sort((a, b) => hotDealScore(b) - hotDealScore(a))
          .slice(0, 4)
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
          : "급락딜";

  const reasonOptions = [
    { key: "", label: "전체" },
    { key: "plunge", label: "급락" },
    { key: "lowest", label: "최저가" },
  ];
  const sortOptions = [
    { key: "discount", label: "할인율" },
    { key: "popular", label: "인기" },
    { key: "recent", label: "최신" },
    { key: "price_asc", label: "낮은 가격" },
  ];
  const scopeTabs = [
    { key: "", label: "전체" },
    { key: "domestic", label: "국내딜" },
    { key: "overseas", label: "해외딜" },
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
          {topDeals.length >= 3 && <TopDrops deals={topDeals} />}

          {domesticDropDeals.length >= 2 && (
            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-gray-900">🇰🇷 국내 급락</h2>
                <Link
                  href="/?scope=domestic"
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  더보기 →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {domesticDropDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            </section>
          )}

          <GoldboxBanner />

          <div className="mb-4 flex flex-wrap gap-2">
            {scopeTabs.map((tab) => (
              <Link
                key={tab.key}
                href={hrefFor({ scope: tab.key || undefined })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
                  (scope ?? "") === tab.key
                    ? "bg-brand text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {reasonOptions.map((option) => (
                <Link
                  key={option.key}
                  href={hrefFor({ ps: option.key || undefined, page: undefined })}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition ${
                    (ps ?? "") === option.key
                      ? "bg-gray-900 text-white"
                      : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
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

          <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="flex items-baseline text-xl font-extrabold">
              <span>{heading}</span>
              <span className="ml-2 text-sm font-normal text-gray-400">
                {activeCount}개
              </span>
            </h1>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-400">
            <p>가격을 추적해 평소보다 진짜 떨어진 것만</p>
            {lastUpdate && (
              <p className="flex items-center gap-1.5 whitespace-nowrap" suppressHydrationWarning>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                가격 확인 {timeAgo(lastUpdate)}
              </p>
            )}
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
                base={{
                  category,
                  sort,
                  hot,
                  q,
                  ...(showEnded ? { se: "1" } : {}),
                  ...(ps ? { ps } : {}),
                  ...(scope ? { scope } : {}),
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
