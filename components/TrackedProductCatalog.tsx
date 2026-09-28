"use client";

import { useMemo, useState } from "react";
import ProductSearchResults from "./ProductSearchResults";
import { TrackedProductRow } from "@/lib/products";

const PAGE_SIZE = 24;

export default function TrackedProductCatalog({ rows }: { rows: TrackedProductRow[] }) {
  const [query, setQuery] = useState("");
  const [mall, setMall] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const malls = useMemo(() => [...new Set(rows.map((r) => r.mallName ?? r.platform))].sort(), [rows]);
  const categories = useMemo(() => {
    const map = new Map(rows.map((r) => [r.categorySlug, r.categoryName]));
    return [...map].filter(([slug]) => slug).sort((a, b) => a[1].localeCompare(b[1], "ko"));
  }, [rows]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((r) => !term || r.title.toLowerCase().includes(term) || (r.mallName ?? r.platform).toLowerCase().includes(term))
      .filter((r) => !mall || (r.mallName ?? r.platform) === mall)
      .filter((r) => !category || r.categorySlug === category)
      .sort((a, b) => {
        if (sort === "price-low") return a.currentPrice - b.currentPrice;
        if (sort === "price-high") return b.currentPrice - a.currentPrice;
        if (sort === "tracked") return b.trackedDays - a.trackedDays;
        if (sort === "drop") return b.rate - a.rate;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [rows, query, mall, category, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const update = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };

  return <>
    <div className="mb-5 grid gap-2 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="sm:col-span-2 lg:col-span-1">
        <span className="sr-only">상품 검색</span>
        <input value={query} onChange={(e) => update(setQuery)(e.target.value)} placeholder="상품명·판매처 검색" className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-brand" />
      </label>
      <select value={mall} onChange={(e) => update(setMall)(e.target.value)} aria-label="판매처" className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm">
        <option value="">모든 판매처</option>{malls.map((m) => <option key={m}>{m}</option>)}
      </select>
      <select value={category} onChange={(e) => update(setCategory)(e.target.value)} aria-label="카테고리" className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm">
        <option value="">모든 카테고리</option>{categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
      </select>
      <select value={sort} onChange={(e) => update(setSort)(e.target.value)} aria-label="정렬" className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm">
        <option value="recent">최근 추가순</option><option value="drop">평균 대비 하락순</option><option value="tracked">오래 추적한 순</option><option value="price-low">낮은 가격순</option><option value="price-high">높은 가격순</option>
      </select>
    </div>
    <p className="mb-3 text-sm font-semibold text-gray-700">조건에 맞는 상품 {filtered.length}개</p>
    {visible.length ? <ProductSearchResults rows={visible} query={query.trim() || "전체 추적"} /> : <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">조건에 맞는 추적 상품이 없습니다.</div>}
    {totalPages > 1 && <nav aria-label="추적 상품 페이지" className="mt-4 flex flex-wrap justify-center gap-1.5">
      {Array.from({ length: totalPages }, (_, i) => <button type="button" key={i} onClick={() => setPage(i + 1)} aria-current={safePage === i + 1 ? "page" : undefined} className={`h-9 min-w-9 rounded-lg px-2 text-sm font-bold ${safePage === i + 1 ? "bg-brand text-white" : "border border-gray-200 bg-white text-gray-600"}`}>{i + 1}</button>)}
    </nav>}
  </>;
}
