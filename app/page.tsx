import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeals, getCuratedDeals, getLastPriceUpdate, sortDealList, SortKey, PriceStatusKey } from "@/lib/deals";
import { normalizeProductImage, productImageQuality, searchProducts, usableProductTitle } from "@/lib/products";
import { timeAgo } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isHealthDeal, headlineDropRate, dropScore, hotDealScore, isVerifiedBestDeal, isVerifiedListing } from "@/lib/dropMetrics";
import DealGrid from "@/components/DealGrid";
import DealCard from "@/components/DealCard";
import ProductSearchResults from "@/components/ProductSearchResults";
import SortDropdown from "@/components/SortDropdown";
import TravelView, { TravelTab } from "@/components/TravelView";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE } from "@/lib/nav";
import { CATEGORIES } from "@/lib/types";
import AdSenseScript from "@/components/AdSenseScript";
import SavedPriceWatches from "@/components/SavedPriceWatches";
import SafeImage from "@/components/SafeImage";
import { getPriceInsights } from "@/lib/insights";
import { formatWon } from "@/lib/format";
import { getTrendingProducts } from "@/lib/trends";
import TrendingProducts from "@/components/TrendingProducts";

export const revalidate = 300;

export async function generateMetadata({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{
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
    hd?: string;
    hp?: string;
    hc?: string;
    hs?: string;
    hl?: string;
    hx?: string;
    tt?: string;
    region?: string;
    o?: string;
    d?: string;
  }>;
}): Promise<Metadata> {
  const searchParams = await searchParamsPromise;
  const cat = CATEGORIES.find((c) => c.slug === searchParams.category);
  const q = (searchParams.q ?? "").slice(0, 50).trim();
  const canonical = cat?.dealType === "shopping"
    ? `/category/${cat.slug}`
    : searchParams.sec === "best"
      ? searchParams.scope === "domestic" ? "/deals/domestic" : searchParams.scope === "overseas" ? "/deals/global" : "/"
      : searchParams.ps === "lowest" ? "/lowest-price" : searchParams.ps === "plunge" ? "/price-drop" : "/";
  const hasQuery = Object.keys(searchParams).length > 0;
  if (q)
    return {
      title: `"${q}" 최저가·특가 검색`,
      robots: { index: false, follow: true },
    };
  if (hasQuery && cat?.dealType !== "flight")
    return { robots: { index: false, follow: true }, alternates: { canonical } };
  if (cat?.dealType === "flight")
    return {
      title: "여행 — 항공권 조회·숙소·여행딜",
      description:
        "한국 출발 항공권의 최근 조회 요금과 숙소·여행 예약처를 확인하세요. 표시 요금은 예약 시 달라질 수 있습니다.",
      robots: { index: false, follow: true },
    };
  if (cat?.dealType === "auction")
    return {
      title: "페이지를 찾을 수 없음",
      robots: { index: false, follow: false },
    };
  return { alternates: { canonical: "/" } };
}

export default async function Home({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{
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
    hd?: string;
    hp?: string;
    hc?: string;
    hs?: string;
    hl?: string;
    hx?: string;
  }>;
}) {
  const searchParams = await searchParamsPromise;
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
  const hotPage = Math.max(1, parseInt(searchParams.hp ?? "1", 10) || 1);
  const hotCategory = CATEGORIES.some((c) => c.dealType === "shopping" && c.slug === searchParams.hc)
    ? searchParams.hc ?? "" : "";
  const hotSort = ["recommended", "score", "drop", "recent", "price"].includes(searchParams.hs ?? "")
    ? searchParams.hs ?? "recommended" : "recommended";
  const hotLowestOnly = searchParams.hl === "1";
  const hotScope = searchParams.hx === "domestic" || searchParams.hx === "overseas" ? searchParams.hx : "";
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
  if (hotCategory) allParams.hc = hotCategory;
  if (hotSort !== "recommended") allParams.hs = hotSort;
  if (hotLowestOnly) allParams.hl = "1";
  if (hotScope) allParams.hx = hotScope;

  const [trackedDeals, curatedDealsRaw, lastUpdate, productMatchesRaw, insights, trendingProducts] = await Promise.all([
    getDeals({ category, sort, hotOnly: hot, q, priceStatus: ps, scope }),
    scope !== "overseas" && !ps && !hot ? getCuratedDeals(sort, category) : Promise.resolve([]),
    getLastPriceUpdate(),
    // 검색 시: 활성 딜뿐 아니라 '가격 추적 중인 상품'도 찾아 지금 살지 판정.
    q.trim().length >= 2 ? searchProducts(q, 24) : Promise.resolve([]),
    !q.trim() && !category && page === 1 ? getPriceInsights().catch(() => []) : Promise.resolve([]),
    !q.trim() && !category && !ps && !hot && !scope && page === 1 ? getTrendingProducts(24).catch(() => []) : Promise.resolve([]),
  ]);

  const term = q.trim().toLowerCase();
  const curatedDeals = curatedDealsRaw
    .filter((d) => scope !== "domestic" || d.platform !== "aliexpress")
    .filter((d) => !term || d.title.toLowerCase().includes(term));

  const seen = new Set<number>();
  const combinedDeals = sortDealList([...trackedDeals, ...curatedDeals], sort)
    .filter((deal) => usableProductTitle(deal.title) && productImageQuality(normalizeProductImage(deal.imageUrl)) > 0)
    .filter((d) => {
      if (seen.has(d.productId)) return false;
      seen.add(d.productId);
      return true;
    });

  const isDefaultHome = !q.trim() && !category && !ps && !hot && !scope && page === 1;
  // 기본 홈의 전체 목록은 가격이력으로 검증된 딜만 노출한다. 이력이 짧거나
  // 정가 할인만 있는 상품은 아래 '새로 발견한 할인'에서 별도로 공개한다.
  const verifiedOnly = isVerifiedListing({ q, category, ps, hot, sec: searchParams.sec });
  const mainDeals = verifiedOnly
    ? combinedDeals.filter(isVerifiedBestDeal)
    : combinedDeals;

  // 건강/보충제는 메인 첫 화면 도배 방지. 카테고리로 직접 들어온 경우에는 그대로 보여준다.
  let healthShown = 0;
  const listDeals = verifiedOnly || category === "health"
    ? mainDeals
    : mainDeals.filter((d) => {
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
  const dealFingerprints = new Set(listDeals.map((d) => `${d.title.toLowerCase().replace(/[^0-9a-z가-힣]/gi, '')}|${(d.mallName ?? d.platform).toLowerCase()}|${d.currentPrice}`));
  const trackedMatchFingerprints = new Set<string>();
  const trackedMatches = productMatchesRaw
    .filter((r) => !dealProductIds.has(r.id))
    .filter((r) => !dealFingerprints.has(`${r.title.toLowerCase().replace(/[^0-9a-z가-힣]/gi, '')}|${(r.mallName ?? r.platform).toLowerCase()}|${r.currentPrice}`))
    .filter((r) => {
      const fingerprint = `${r.title.replace(/\s+/g, '').toLowerCase()}|${r.mallName ?? r.platform}|${r.currentPrice}`;
      if (trackedMatchFingerprints.has(fingerprint)) return false;
      trackedMatchFingerprints.add(fingerprint);
      return true;
    })
    .slice(0, 8);

  const sortOptions = [
    { key: "popular", label: "추천" },
    { key: "recent", label: "최신" },
    { key: "discount", label: "가격이력 우선" },
    { key: "score", label: "가격 점수" },
  ];

  const sortedHotList = (isDefaultHome ? combinedDeals : [])
    .filter((d) => d.status !== "ended" && (
      (!d.isCurated && (d.historyPointCount ?? 0) > 0) ||
      (d.platform !== "aliexpress" && d.isCurated && d.currentPrice > 0 && d.discountVsList >= 10)
    ))
    .filter((d) => !hotCategory || d.categorySlug === hotCategory)
    .filter((d) => !hotLowestOnly || d.isLowestEver)
    .filter((d) => !hotScope || (hotScope === "overseas" ? d.platform === "aliexpress" : d.platform !== "aliexpress"))
    .sort((a, b) => {
      if (hotSort === "drop") return headlineDropRate(b) - headlineDropRate(a);
      if (hotSort === "recent") return new Date(b.checkedAt ?? b.detectedAt).getTime() - new Date(a.checkedAt ?? a.detectedAt).getTime();
      if (hotSort === "price") return a.currentPrice - b.currentPrice;
      if (hotSort === "recommended") {
        const verifiedFirst = Number(isVerifiedBestDeal(b)) - Number(isVerifiedBestDeal(a));
        return verifiedFirst || hotDealScore(b) - hotDealScore(a);
      }
      return (dropScore(b).score ?? 0) - (dropScore(a).score ?? 0);
    });
  const verifiedHotList = sortedHotList.filter(isVerifiedBestDeal);
  const hotTotalPages = Math.max(1, Math.ceil(verifiedHotList.length / 8));
  const safeHotPage = Math.min(hotPage, hotTotalPages);
  const hotItems = verifiedHotList.slice((safeHotPage - 1) * 8, safeHotPage * 8);

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
      {Object.keys(searchParams).length === 0 && trackedDeals.filter(isVerifiedBestDeal).length >= 3 && <AdSenseScript />}
      {demoBanner}

      {isDefaultHome && (
        <header className="mb-5">
          <h1 className="text-2xl font-black leading-tight text-gray-950 sm:text-3xl">
            진짜 가격이 떨어진 상품을 찾습니다
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            표시 할인율만 믿지 않고 평균가·최저가·가격 이력을 비교해 지금 싼 상품을 먼저 보여드립니다.
          </p>
        </header>
      )}

      <div className="mb-5">
        <SearchBar initial={q} />
        {!q && <p className="mt-2 text-center text-xs font-medium text-gray-500">가격 이력으로 확인한 하락과 판매처 표시 할인을 구분해 보여줍니다.</p>}
      </div>

      {isDefaultHome && <SavedPriceWatches />}

      {isDefaultHome && (
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" aria-labelledby="evidence-heading">
          <p className="text-xs font-extrabold text-brand">직접 수집한 가격 기록</p>
          <h2 id="evidence-heading" className="mt-1 text-xl font-extrabold text-gray-950">오늘의 가격 판단 근거</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">
            판매처가 적은 할인율 대신 실제 관측 가격을 비교합니다. 아래 수치는 마지막 수집 시점의 기록이며,
            상품 옵션·배송비·쿠폰에 따라 결제 금액은 달라질 수 있습니다.
          </p>
          {insights.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {insights.slice(0, 3).map(({ product, stats, averageGapPercent }) => (
                <article key={product.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <Link href={`/price/${product.id}`} className="group block h-full p-3.5 transition hover:bg-gray-50 sm:p-4">
                    <div className="flex gap-3.5">
                      <SafeImage
                        src={product.imageUrl}
                        alt={`${product.title} 상품 이미지`}
                        className="h-24 w-24 shrink-0 rounded-lg border border-gray-100 bg-white object-contain sm:h-28 sm:w-28"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-500">{product.mallName || product.platform} · {stats.trackedDays}일 추적</p>
                        <h3 className="mt-1.5 line-clamp-2 text-sm font-bold leading-5 text-gray-950">{product.title}</h3>
                        <p className="mt-2 text-xs text-gray-500">마지막 확인가</p>
                        <p className="text-xl font-extrabold leading-tight text-brand">{formatWon(stats.current)}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs leading-5">
                      <div><span className="block text-gray-500">{stats.trackedDays >= 30 ? "최근 30일 평균" : `추적 ${stats.trackedDays}일 평균`}</span><strong className="text-sm text-gray-900">{formatWon(stats.avg30!)}</strong></div>
                      <div><span className="block text-gray-500">평균 대비</span><strong className="text-sm text-emerald-700">{averageGapPercent > 0 ? `${averageGapPercent}% 낮음` : "하락 아님"}</strong></div>
                      <div><span className="block text-gray-500">추적 최저가</span><strong className="text-sm text-gray-900">{formatWon(stats.minAll)}</strong></div>
                      <div><span className="block text-gray-500">관측 기록</span><strong className="text-sm text-gray-900">{stats.points}회</strong></div>
                    </div>
                    <span className="mt-3 inline-flex min-h-9 items-center text-sm font-bold text-brand group-hover:underline">가격 그래프 보기 →</span>
                  </Link>
                </article>
              ))}
            </div>
          ) : <p className="mt-5 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">최근 24시간 안에 확인된 가격 분석 사례가 없습니다. 검증되지 않은 가격을 특가로 소개하지 않습니다.</p>}
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/insights" className="text-brand hover:underline">실제 가격 추적 사례 전체 →</Link>
            <Link href="/guides/price-drop-failures" className="text-gray-700 hover:underline">가격 판단이 틀릴 수 있는 경우 →</Link>
          </div>
        </section>
      )}

      {isDefaultHome && (
        <section className="mb-8">
          <div className="mb-3 space-y-2">
            <h2 className="text-lg font-extrabold text-gray-900">🔥 가격 이력으로 확인한 핫딜</h2>
            <p className="text-xs leading-5 text-gray-500">평균가·최저가와 비교할 수 있는 상품만 이 구역에 표시합니다.</p>
            <div className="flex flex-wrap items-center gap-2">
              <SortDropdown options={catOptions} value={hotCategory} param="hc" params={allParams} ariaLabel="핫딜 카테고리" />
              <SortDropdown options={[
                { key: "recommended", label: "추천순" },
                { key: "score", label: "가격 점수순" },
                { key: "drop", label: "하락률 높은순" },
                { key: "recent", label: "최근 확인순" },
                { key: "price", label: "낮은 가격순" },
              ]} value={hotSort} param="hs" params={allParams} ariaLabel="핫딜 정렬" />
              <SortDropdown options={[
                { key: "", label: "국내+해외" },
                { key: "domestic", label: "국내몰만" },
                { key: "overseas", label: "해외직구만" },
              ]} value={hotScope} param="hx" params={allParams} ariaLabel="핫딜 판매 범위" />
              <Link href={hrefFor({ hl: hotLowestOnly ? undefined : "1", hp: undefined })}
                aria-current={hotLowestOnly ? "true" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${hotLowestOnly ? "bg-brand text-white" : "border border-gray-200 bg-white text-gray-600"}`}>
                추적 최저가만
              </Link>
            </div>
            {!hotScope && <p className="text-xs leading-5 text-gray-600">현재 검증 완료: 국내몰 {verifiedHotList.filter((deal) => deal.platform !== "aliexpress").length}개 · 해외직구 {verifiedHotList.filter((deal) => deal.platform === "aliexpress").length}개. 국내몰 검증 상품이 없으면 해외 상품만 표시됩니다.</p>}
          </div>

          {hotItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-gray-700">이 조건에 맞는 검증 상품이 아직 없습니다.</p>
              <p className="mt-2 text-xs leading-5 text-gray-500">14일 이상 추적하고 유효한 가격 기록을 20회 이상 확보한 상품부터 검증 기준을 확인합니다. 최신 가격과 하락폭도 함께 검토합니다.</p>
              <Link href="/tracking" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-gray-900 px-4 text-sm font-bold text-white">전체 상품 둘러보기</Link>
            </div>
          ) : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {hotItems.map((d, index) => <DealCard key={d.id} deal={d} priorityImage={index === 0} />)}
          </div>}
          {hotTotalPages > 1 && (
            <nav aria-label="핫딜 페이지" className="mt-3 flex items-center justify-center gap-1.5">
              {Array.from({ length: hotTotalPages }, (_, i) => (
                <Link key={i} href={hrefFor({ hp: i === 0 ? undefined : String(i + 1) })}
                  aria-label={`핫딜 ${i + 1}페이지`} aria-current={safeHotPage === i + 1 ? "page" : undefined}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${safeHotPage === i + 1 ? "bg-brand text-white" : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}>
                  {i + 1}
                </Link>
              ))}
            </nav>
          )}

          <p className="mt-5 text-sm leading-6 text-gray-700">가격 검증 중인 상품과 판매처 표시 할인은 <Link href="/tracking" className="font-bold text-brand underline">전체 상품 둘러보기</Link>에서 확인할 수 있습니다. 이 상품들은 검증된 핫딜에 포함하지 않습니다.</p>

        </section>
      )}

      {isDefaultHome && <TrendingProducts products={trendingProducts} />}

      {isDefaultHome && (
        <section className="mb-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">가격 검증 기준</p>
          <h2 className="mt-1 text-lg font-extrabold text-gray-950">가격 이력이 충분한 상품만 검증 완료로 표시합니다</h2>
          <p className="mt-2 text-sm leading-6 text-gray-700">
            판매처의 정가 할인은 가격 이력 검증과 구분합니다. 옵션 변경·품절·짧은 추적 기간 때문에 가격이 떨어진 것처럼 보이는 사례도 숨기지 않고 설명합니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/guides/price-drop-failures" className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-bold text-white">가격 판단 실패 사례</Link>
            <Link href="/guides" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800">가격 비교 기준 전체</Link>
          </div>
        </section>
      )}

      {!isDefaultHome && (
        <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-baseline text-xl font-extrabold text-gray-900">
              <span>{q ? `"${q}" 검색 결과` : activeCat ? `${activeCat.name} 핫딜` : verifiedOnly ? "🔥 검증된 핫딜" : "핫딜"}</span>
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
            <p>{q
              ? trackedMatches.length > 0
                ? "현재 조건에 맞는 특가가 없습니다."
                : "검색 결과가 없습니다."
              : "아직 이 조건에 맞는 핫딜이 없습니다."}</p>
            {q && trackedMatches.length > 0 && <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">지금 확인된 특가는 없지만, 아래에서 가격 이력을 수집 중인 관련 상품 {trackedMatches.length}개를 비교할 수 있습니다.</p>}
            <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-gray-900 px-4 text-sm font-bold text-white">필터 초기화</Link>
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
      )}

      {!isDefaultHome && trackedMatches.length > 0 && (
        <ProductSearchResults rows={trackedMatches} query={q.trim()} />
      )}

    </div>
  );
}








