import Link from "next/link";
import { Suspense } from "react";
import RealtimeTrendTicker from "./RealtimeTrendTicker";
import SectionNav from "./SectionNav";
import { getRealtimeTrends } from "@/lib/trends";

const DETAIL_NAV = [
  { href: "/price-drop", icon: "🔥", label: "가격급락" },
  { href: "/lowest-price", icon: "🏆", label: "추적 최저가" },
  { href: "/market-prices", icon: "🌾", label: "농산물 기준가격" },
];

export default async function Header() {
  const trends = await getRealtimeTrends();
  return (
    <header data-site-header="Dropped" className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap" aria-label="떨어졌다 홈">
          <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
            <rect width="48" height="48" rx="13" fill="#ef4444" />
            <path d="M24 12 V27" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
            <path d="M17 22 L24 29 L31 22" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="16" y1="35" x2="32" y2="35" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-extrabold tracking-tight">떨어졌다</span>
        </Link>
        <RealtimeTrendTicker trends={trends} />
      </div>
      <div className="border-t border-gray-100">
        <div className="mx-auto flex min-h-12 max-w-6xl items-center gap-3 overflow-x-auto px-4 py-2">
          <Suspense fallback={
            <nav className="flex shrink-0 items-center gap-1.5 whitespace-nowrap" aria-label="주요 섹션">
              <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white shadow-sm"><span aria-hidden="true">🔥 </span>핫딜</Link>
              <Link href="/store-deals" className="inline-flex min-h-11 items-center rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-extrabold text-gray-700"><span aria-hidden="true">🛒 </span>마트·편의점</Link>
              <Link href="/tracking" className="inline-flex min-h-11 items-center rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-extrabold text-gray-700"><span aria-hidden="true">🛍️ </span>전체상품</Link>
              <Link href="/?category=flight" className="inline-flex min-h-11 items-center rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-extrabold text-gray-700"><span aria-hidden="true">✈️ </span>여행딜</Link>
            </nav>
          }>
            <SectionNav />
          </Suspense>
          <Link href="/guides" className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-bold text-gray-700 hover:border-brand/40 hover:text-brand">
            가이드
          </Link>
          <nav className="hidden items-center gap-1 border-l border-gray-200 pl-3 text-sm md:flex">
          {DETAIL_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-2.5 py-1.5 font-medium text-gray-600 hover:bg-gray-100"
            >
              <span aria-hidden="true">{n.icon} </span>{n.label}
            </Link>
          ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
