import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeals, getCuratedDeals, getLastPriceUpdate, sortDealList, diversifyTop, SortKey, PriceStatusKey } from "@/lib/deals";
import { searchProducts } from "@/lib/products";
import { timeAgo } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isHealthDeal, headlineDropRate, dropScore } from "@/lib/dropMetrics";
import DealGrid from "@/components/DealGrid";
import TopDrops from "@/components/TopDrops";
import ProductSearchResults from "@/components/ProductSearchResults";
import SortDropdown from "@/components/SortDropdown";
import TravelView, { TravelTab } from "@/components/TravelView";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE } from "@/lib/nav";
import { CATEGORIES } from "@/lib/types";
import { getTrendingProducts } from "@/lib/trends";
import TrendingProducts from "@/components/TrendingProducts";

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
      title: "베스트딜 — 가격 이력으로 검증한 할인",
      description:
        "국내·해외 상품 중 가격 이력, 추적 최저가, 평균가 대비 하락률로 지금 볼 만한 딜만 모았습니다.",
      alternates: { canonical: "/" },
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
      title: "페이지를 찾을 수 없음",
      robots: { index: false, follow: false },
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
    "score",
    "discount_asc",
    "price_asc",
    "price_desc",
    "recent",
  ];
  const sort: SortKey = validDealSorts.includes(searchParams.sort as SortKey)
    ? (searchParams.sort as SortKey)
    : "recent";
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
  const scopeParam = searchParams.scope ?? searchParams.bs;
  const scope =
    scopeParam === "domestic" || scopeParam === "overseas"
      ? scopeParam
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
    notFound();
  }

  // ── 쇼핑 딜 ──
  const catOptions = [
    { key: "", label: "전체 카테고리" },
    ...CATEGORIES.filter((c) => c.dealType === "shopping").map((c) => ({
      key: c.slug,
      label: c.name,
    })),
  ];

  const allParams: Record<string, string> = {};
  if (category) allParams.category = category;
  if (sort !== "recent") allParams.sort = sort;
  if (hot) allParams.hot = "1";
  if (q) allParams.q = q;
  if (showEnded) allParams.se = "1";
  if (ps) allParams.ps = ps;
  if (scope) allParams.scope = scope;

  const [trackedDeals, curatedDealsRaw, lastUpdate, productMatchesRaw, trendingProducts] = await Promise.all([
    getDeals({ category, sort, hotOnly: hot, q, priceStatus: ps, scope }),
    scope !== "overseas" && !ps && !hot ? getCuratedDeals(sort, category) : Promise.resolve([]),
    getLastPriceUpdate(),
    // 검색 시: 활성 딜뿐 아니라 '가격 추적 중인 상품'도 찾아 지금 살지 판정.
    q.trim().length >= 2 ? searchProducts(q, 24) : Promise.resolve([]),
    !q.trim() && !category && page === 1 ? getTrendingProducts() : Promise.resolve([]),
  ]);

  const term = q.trim().toLowerCase();
  const curatedDeals = curatedDealsRaw
    .filter((d) => scope !== "domestic" || d.platform !== "aliexpress")
    .filter((d) => !term || d.title.toLowerCase().includes(term));

  const seen = new Set<number>();
  const combinedDeals = sortDealList([...trackedDeals, ...curatedDeals], sort)
    .filter((d) => {
      if (seen.has(d.productId)) return false;
      seen.add(d.productId);
      return true;
    });

  // 건강/보충제는 메인 첫 화면 도배 방지. 카테고리로 직접 들어온 경우에는 그대로 보여준다.
  let healthShown = 0;
  const listDeals = category === "health"
    ? combinedDeals
    : combinedDeals.filter((d) => {
        if (!isHealthDeal(d)) return true;
        healthShown += 1;
        return healthShown <= 1;
      });

  const totalPages = Math.max(1, Math.ceil(listDeals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedList = listDeals.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const listCount = listDeals.length;

  // 검색 결과의 '추적 상품' 중, 이미 위/아래 활성 딜로 나온 것은 중복 제거.
  const dealProductIds = new Set(listDeals.map((d) => d.productId));
  const trackedMatches = productMatchesRaw.filter((r) => !dealProductIds.has(r.id));

  const sortOptions = [
    { key: "popular", label: "추천" },
    { key: "recent", label: "최신" },
    { key: "discount", label: "할인/하락률" },
    { key: "score", label: "DROP SCORE" },
  ];

  // 상단 추천 스트립 — 최신순 리스트에선 좋은 딜이 아래로 밀리므로
  // "지금 가장 많이 떨어진" 순(하락률 상위)을 위에 별도로 보여준다.
  //   실시간 인기(골드박스)는 트래픽 쌓인 뒤로 보류 → 지금은 하락률 휴리스틱만.
  //   검색·가격상태 필터·인기딜 뷰나 2페이지 이상에선 숨겨 리스트에 집중.
  const showTopStrip = !q.trim() && !ps && !hot && safePage === 1;
  const topDrops = showTopStrip
    ? diversifyTop(
        listDeals
          .filter((d) => {
            if (d.status === "ended") return false;
            if (d.isCurated) return false;
            if (headlineDropRate(d) < 10) return false;
            return dropScore(d).score !== null;
          })
          .sort((a, b) => {
            // 실제 가격이력이 충분한(7일+) 상품을 우선, 그다음 하락률 큰 순.
            const ea = (a.trackedDays ?? 0) >= 7 ? 1 : 0;
            const eb = (b.trackedDays ?? 0) >= 7 ? 1 : 0;
            if (ea !== eb) return eb - ea;
            return headlineDropRate(b) - headlineDropRate(a);
          }),
        8,
        2
      )
    : [];

  // 국내 베스트딜은 '평소가 이력'이 없어 위 '가격 이력 급락'엔 안 들어온다.
  //   → 가격이력 급락 스트립이 없을 때(주로 국내딜 탭), 원가 대비 할인율 상위로
  //     '국내 베스트딜 TOP' 스트립을 대신 보여준다. (스트립은 항상 최대 1개)
  const topCurated =
    showTopStrip && topDrops.length < 4
      ? diversifyTop(
          listDeals
            .filter(
              (d) =>
                d.isCurated &&
                d.status !== "ended" &&
                d.listPrice > d.currentPrice &&
                d.discountVsList >= 10
            )
            .sort((a, b) => b.discountVsList - a.discountVsList),
          8,
          2
        )
      : [];

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

      <TrendingProducts products={trendingProducts} />

      {trackedMatches.length > 0 && (
        <ProductSearchResults rows={trackedMatches} query={q.trim()} />
      )}

      {topDrops.length >= 4 ? (
        <TopDrops
          deals={topDrops}
          header={
            <h2 className="mb-3 text-lg font-extrabold text-gray-900">
              🔥 가격 이력 급락 TOP
            </h2>
          }
        />
      ) : topCurated.length >= 4 ? (
        <TopDrops
          deals={topCurated}
          header={
            <h2 className="mb-3 text-lg font-extrabold text-gray-900">
              🛒 국내 베스트딜 TOP
            </h2>
          }
        />
      ) : null}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-baseline text-xl font-extrabold text-gray-900">
              <span>{q ? `"${q}" 베스트딜` : activeCat ? `${activeCat.name} 베스트딜` : "베스트딜"}</span>
              <span className="ml-2 text-sm font-normal text-gray-400">{listCount}개</span>
            </h1>
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

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {([
              { key: "", label: "전체" },
              { key: "domestic", label: "국내딜" },
              { key: "overseas", label: "해외딜" },
            ] as const).map((tab) => (
              <Link
                key={tab.key}
                href={hrefFor({ scope: tab.key || undefined, page: undefined })}
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
          {lastUpdate && (
            <p className="flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-400" suppressHydrationWarning>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              가격 확인 {timeAgo(lastUpdate)}
            </p>
          )}
        </div>

        {paginatedList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
            {q
              ? trackedMatches.length > 0
                ? "지금 '특가'로 뜬 건 없어요. 위 추적 상품에서 지금 살 만한지 확인하세요."
                : "검색 결과가 없습니다."
              : "아직 이 조건에 맞는 베스트딜이 없습니다."}
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
                ...(scope ? { scope } : {}),
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
