import Link from "next/link";
import RealtimeTrendTicker from "./RealtimeTrendTicker";
import { getRealtimeTrends } from "@/lib/trends";

const NAV = [
  { href: "/price-drop", label: "🔥 가격급락" },
  { href: "/lowest-price", label: "🏆 추적 최저가" },
  { href: "/deals", label: "베스트딜" },
  { href: "/?category=flight", label: "✈️ 여행" },
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
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-2.5 py-1.5 font-medium text-gray-600 hover:bg-gray-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <RealtimeTrendTicker trends={trends} />
      </div>
    </header>
  );
}
