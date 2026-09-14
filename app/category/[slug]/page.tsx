import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeals, getLastPriceUpdate, SortKey, PriceStatusKey, PRICE_STATUS } from "@/lib/deals";
import { timeAgo } from "@/lib/format";
import { hotDealScore, isVerifiedBestDeal, limitHealthDeals } from "@/lib/dropMetrics";
import { categoryHref, PAGE_SIZE } from "@/lib/nav";
import { CATEGORIES } from "@/lib/types";
import { SITE_URL } from "@/lib/site";
import DealGrid from "@/components/DealGrid";
import SortDropdown from "@/components/SortDropdown";
import Pagination from "@/components/Pagination";
import TopDrops from "@/components/TopDrops";
import Breadcrumb from "@/components/Breadcrumb";

export const revalidate = 300;

const SHOPPING_CATS = CATEGORIES.filter((c) => c.dealType === "shopping");

export function generateStaticParams() {
  return SHOPPING_CATS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  const cat = SHOPPING_CATS.find((c) => c.slug === routeParams.slug);
  if (!cat) return { title: "카테고리 없음", robots: { index: false, follow: false } };
  const deals = await getDeals({ category: cat.slug });
  return {
    title: `${cat.name} 가격 이력·특가`,
    description: `${cat.name} 상품의 현재 가격, 실제 추적 기간, 평균 대비 변화를 확인하세요. 이력이 부족한 상품은 별도로 안내합니다.`,
    robots: { index: deals.length >= 3 && Object.keys(query).length === 0, follow: true },
    alternates: { canonical: `${SITE_URL}/category/${cat.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; ps?: string; scope?: string; page?: string }>;
}) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  const cat = SHOPPING_CATS.find((c) => c.slug === routeParams.slug);
  if (!cat) notFound();

  const validSorts: SortKey[] = ["discount", "popular", "discount_asc", "price_asc", "price_desc", "recent"];
  const sort: SortKey = validSorts.includes(query.sort as SortKey)
    ? (query.sort as SortKey)
    : "discount";
  const validPs = new Set<PriceStatusKey>(["plunge", "lowest", "bigdrop", "fresh"]);
  const ps = validPs.has(query.ps as PriceStatusKey)
    ? (query.ps as PriceStatusKey)
    : undefined;
  const scope =
    query.scope === "domestic" || query.scope === "overseas"
      ? query.scope
      : undefined;
  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);

  const basePath = `/category/${cat.slug}`;

  const [fetched, lastUpdate] = await Promise.all([
    getDeals({ category: cat.slug, sort, priceStatus: ps, scope }),
    getLastPriceUpdate(),
  ]);

  const totalPages = Math.max(1, Math.ceil(fetched.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const deals = fetched.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const topDeals = !ps
    ? limitHealthDeals(
        fetched.filter(isVerifiedBestDeal).sort((a, b) => hotDealScore(b) - hotDealScore(a)),
        1
      ).slice(0, 6)
    : [];

  const sortParams: Record<string, string> = {};
  if (sort !== "discount") sortParams.sort = sort;
  if (ps) sortParams.ps = ps;
  if (scope) sortParams.scope = scope;

  const hrefFor = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { ...sortParams, ...next };
    Object.entries(merged).forEach(([key, value]) => {
      if (value) sp.set(key, value);
    });
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const paginationHref = (p: number) =>
    categoryHref(cat.slug, { sort, ps, scope, page: p });

  const psLabel = ps ? PRICE_STATUS.find((s) => s.key === ps)?.label : undefined;

  const sortOptions = [
    { key: "discount", label: "할인율" },
    { key: "popular", label: "인기" },
    { key: "recent", label: "최신" },
    { key: "price_asc", label: "낮은 가격" },
  ];
  const reasonOptions = [
    { key: "", label: "전체" },
    { key: "plunge", label: "급락" },
    { key: "lowest", label: "최저가" },
  ];
  const scopeTabs = [
    { key: "", label: "전체" },
    { key: "domestic", label: "국내딜" },
    { key: "overseas", label: "해외딜" },
  ];

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "홈", href: "/" },
          { label: cat.name },
        ]}
      />

      {topDeals.length >= 3 && <TopDrops deals={topDeals} />}

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
        <SortDropdown
          options={sortOptions}
          value={sort}
          param="sort"
          params={sortParams}
          basePath={basePath}
        />
      </div>

      <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="flex items-baseline text-xl font-extrabold">
          <span>{psLabel ?? cat.name}</span>
          <span className="ml-2 text-sm font-normal text-gray-400">
            {fetched.length}개
          </span>
        </h1>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-400">
        <p>수집한 가격 이력과 현재 가격을 함께 확인하세요</p>
        {lastUpdate && (
          <p className="flex items-center gap-1.5 whitespace-nowrap" suppressHydrationWarning>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            가격 확인 {timeAgo(lastUpdate)}
          </p>
        )}
      </div>

      {deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
          아직 이 카테고리에 감지된 특가가 없습니다.
        </div>
      ) : (
        <>
          <DealGrid deals={deals} />
          <Pagination
            page={safePage}
            totalPages={totalPages}
            base={{}}
            hrefFn={paginationHref}
          />
        </>
      )}
    </div>
  );
}
