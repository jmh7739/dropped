"use client";

import { useMemo, useState } from "react";
import type { Deal } from "@/lib/types";
import DealGrid from "./DealGrid";

const PAGE_SIZE = 12;

function roundRobinMerchant(deals: Deal[]): Deal[] {
  const groups = new Map<string, Deal[]>();
  for (const deal of deals) {
    const key = deal.mallName || "기타 판매처";
    groups.set(key, [...(groups.get(key) ?? []), deal]);
  }
  const result: Deal[] = [];
  while ([...groups.values()].some((items) => items.length)) {
    for (const items of groups.values()) {
      const next = items.shift();
      if (next) result.push(next);
    }
  }
  return result;
}

export default function SellerDiscountSection({ deals }: { deals: Deal[] }) {
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("diverse");
  const [page, setPage] = useState(0);
  const merchants = [...new Set(deals.map((deal) => deal.mallName).filter(Boolean) as string[])].sort();
  const categories = [...new Map(deals.map((deal) => [deal.categorySlug, deal.categoryName])).entries()];

  const filtered = useMemo(() => {
    const matches = deals.filter((deal) =>
      (!merchant || deal.mallName === merchant) && (!category || deal.categorySlug === category));
    const ordered = [...matches];
    if (sort === "discount") ordered.sort((a, b) => b.discountVsList - a.discountVsList);
    else if (sort === "price_asc") ordered.sort((a, b) => a.currentPrice - b.currentPrice);
    else if (sort === "price_desc") ordered.sort((a, b) => b.currentPrice - a.currentPrice);
    else if (sort === "recent") ordered.sort((a, b) => new Date(b.checkedAt ?? b.detectedAt).getTime() - new Date(a.checkedAt ?? a.detectedAt).getTime());
    else return roundRobinMerchant(ordered.sort((a, b) => b.discountVsList - a.discountVsList));
    return ordered;
  }, [deals, merchant, category, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const change = (setter: (value: string) => void, value: string) => { setter(value); setPage(0); };
  const selectClass = "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700";

  if (!deals.length) return null;
  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-gray-900">판매처 표시 할인</h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">판매처가 표시한 정가 기준 할인입니다. 가격 이력 검증과 구분하며 판매처를 번갈아 보여줍니다.</p>
        </div>
        <span className="text-xs font-bold text-gray-500">조건에 맞는 상품 {filtered.length}개</span>
      </div>
      <div className="my-3 flex flex-wrap gap-2">
        <select aria-label="판매처 할인 판매처" value={merchant} onChange={(e) => change(setMerchant, e.target.value)} className={selectClass}>
          <option value="">전체 판매처</option>{merchants.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select aria-label="판매처 할인 카테고리" value={category} onChange={(e) => change(setCategory, e.target.value)} className={selectClass}>
          <option value="">전체 카테고리</option>{categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
        </select>
        <select aria-label="판매처 할인 정렬" value={sort} onChange={(e) => change(setSort, e.target.value)} className={selectClass}>
          <option value="diverse">판매처 다양하게</option><option value="discount">할인율 높은순</option>
          <option value="recent">최근 확인순</option><option value="price_asc">낮은 가격순</option><option value="price_desc">높은 가격순</option>
        </select>
      </div>
      {visible.length ? <DealGrid deals={visible} /> : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">이 조건에 맞는 상품이 없습니다.</div>}
      {pages > 1 && <div className="mt-3 flex justify-center gap-1.5">{Array.from({ length: pages }, (_, index) => <button key={index} type="button" onClick={() => setPage(index)} aria-current={safePage === index ? "page" : undefined} className={`h-8 w-8 rounded-lg text-xs font-bold ${safePage === index ? "bg-brand text-white" : "border bg-white text-gray-600"}`}>{index + 1}</button>)}</div>}
    </div>
  );
}
