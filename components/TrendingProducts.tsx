"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SafeImage from "./SafeImage";
import { displayTitle } from "@/lib/format";
import type { TrendingProduct } from "@/lib/trends";

const PAGE_SIZE = 10;

export default function TrendingProducts({
  products,
}: {
  products: TrendingProduct[];
}) {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("trend");

  const keywords = [...new Set(products.map((product) => product.keyword))];
  const categories = [...new Set(products.map((product) => product.category))].sort();
  const filtered = useMemo(() => {
    const rows = products.filter((product) => (!keyword || product.keyword === keyword) && (!category || product.category === category));
    if (sort === "price_asc") rows.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    else if (sort === "price_desc") rows.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    else if (sort === "recent") rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    else rows.sort((a, b) => b.hotScore - a.hotScore || b.productScore - a.productScore);
    return rows;
  }, [products, keyword, category, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const newestUpdate = products.reduce(
    (latest, product) =>
      new Date(product.updatedAt).getTime() > new Date(latest).getTime()
        ? product.updatedAt
        : latest,
    products[0]?.updatedAt ?? new Date(0).toISOString(),
  );
  const updatedLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(newestUpdate));

  if (!products.length) return null;

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-lg font-extrabold text-gray-900">👀 실시간 급상승 검색어 관련 상품</h2>
        <p className="mt-1 text-xs text-gray-500" suppressHydrationWarning>
          최근 급상승 검색어와 상품명이 맞는 항목만 모았습니다. 가격 이력 검증 전 상품은 판매처에서 최종 가격을 확인하세요 · {updatedLabel} 갱신 · 총 {products.length}개
        </p>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <select aria-label="인기 검색어" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0); }} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="">전체 검색어</option>{keywords.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="인기 상품 카테고리" value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="">전체 카테고리</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="인기 상품 정렬" value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="trend">트렌드순</option><option value="recent">최근 갱신순</option><option value="price_asc">낮은 가격순</option><option value="price_desc">높은 가격순</option>
        </select>
        <span className="self-center text-xs font-bold text-gray-500">{filtered.length}개</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map((product) => (
          <Link
            key={product.id}
            href={`/price/${product.id}`}
            prefetch={false}
            className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <SafeImage
              src={product.imageUrl}
              alt={product.title}
              className="aspect-square w-full object-cover"
            />
            <div className="p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold">
                <span className="truncate rounded bg-red-50 px-1.5 py-0.5 text-red-700">
                  {product.keyword}
                </span>
                <span className="shrink-0 text-gray-600">{product.platform === "coupang" ? "쿠팡" : product.platform === "cps" ? "국내몰" : product.platform === "aliexpress" ? "알리익스프레스" : product.platform}</span>
              </div>
              <h3 className="line-clamp-2 text-sm font-bold leading-5 text-gray-900 group-hover:text-brand">
                {displayTitle(product.title)}
              </h3>
              {product.price != null ? (
                <p className="mt-1 text-sm font-extrabold text-brand">
                  {product.price.toLocaleString("ko-KR")}원
                </p>
              ) : (
                <p className="mt-1 text-[11px] font-semibold text-gray-600">
                  판매 페이지에서 가격 확인
                </p>
              )}
              <p className="mt-1 text-[10px] font-medium text-gray-400">가격 검증 전 · 판매처에서 최종 확인</p>
            </div>
          </Link>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" aria-label={`관련 상품 ${products.length}개 페이지`}>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`${i + 1}페이지`}
              aria-current={safePage === i}
              className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                safePage === i
                  ? "bg-brand text-white"
                  : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
