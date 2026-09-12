import Link from "next/link";
import { Suspense } from "react";
import RealtimeTrendTicker from "./RealtimeTrendTicker";
import SectionNav from "./SectionNav";
import { getRealtimeTrends } from "@/lib/trends";

const DETAIL_NAV = [
  { href: "/price-drop", label: "🔥 가격급락" },
  { href: "/lowest-price", label: "🏆 추적 최저가" },
];

export default async function Header() {
  const trends = await getRealtimeTrends();
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
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
            <nav className="flex items-center gap-1.5" aria-label="주요 섹션">
              <Link href="/" className="rounded-full bg-brand px-4 py-1.5 text-sm font-extrabold text-white shadow-sm">🔥 핫딜</Link>
              <Link href="/?category=flight" className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-extrabold text-gray-700">✈️ 여행딜</Link>
            </nav>
          }>
            <SectionNav />
          </Suspense>
          <nav className="hidden items-center gap-1 border-l border-gray-200 pl-3 text-sm md:flex">
          {DETAIL_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-2.5 py-1.5 font-medium text-gray-600 hover:bg-gray-100"
            >
              {n.label}
            </Link>
          ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
