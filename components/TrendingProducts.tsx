"use client";

import { useState } from "react";
import Link from "next/link";
import SafeImage from "./SafeImage";
import { formatWon, displayTitle } from "@/lib/format";
import type { TrendingProduct } from "@/lib/trends";

const PAGE_SIZE = 10;

export default function TrendingProducts({ products }: { products: TrendingProduct[] }) {
  const [page, setPage] = useState(0);
  if (!products.length) return null;

  const pageCount = Math.ceil(products.length / PAGE_SIZE);
  const visible = products.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-lg font-extrabold text-gray-900">요즘 뜨는 상품</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map((product) => (
          <Link
            key={product.id}
            href={`/price/${product.id}`}
            className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <SafeImage
              src={product.imageUrl}
              alt={product.title}
              className="aspect-square w-full object-cover"
            />
            <div className="p-3">
              <span className="text-[11px] font-bold text-brand">#{product.keyword}</span>
              <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-gray-900 group-hover:text-brand">
                {displayTitle(product.title)}
              </h3>
              {product.price != null && (
                <div className="mt-1.5 text-sm font-extrabold text-gray-900">
                  {formatWon(product.price)}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
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
