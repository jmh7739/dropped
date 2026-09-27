"use client";

import { useState } from "react";
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
  if (!products.length) return null;

  const pageCount = Math.ceil(products.length / PAGE_SIZE);
  const visible = products.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const newestUpdate = products.reduce(
    (latest, product) =>
      new Date(product.updatedAt).getTime() > new Date(latest).getTime()
        ? product.updatedAt
        : latest,
    products[0].updatedAt,
  );
  const updatedLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(newestUpdate));

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-lg font-extrabold text-gray-900">👀 인기 검색어 관련 상품</h2>
        <p className="mt-1 text-xs text-gray-500" suppressHydrationWarning>
          최근 7일 쇼핑 검색 흐름에서 상품명이 실제 검색어와 맞는 항목만 모았습니다. 가격 이력 검증 전 상품은 판매처에서 최종 가격을 확인하세요 · {updatedLabel} 갱신 · 총 {products.length}개
        </p>
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
                <span className="shrink-0 text-gray-600">쿠팡</span>
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
              aria-current={page === i}
              className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                page === i
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
