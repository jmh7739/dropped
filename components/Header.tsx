import Link from "next/link";

const NAV = [
  { href: "/", label: "핫딜" },
  { href: "/?category=flight", label: "✈️ 여행" },
  { href: "/?category=auction", label: "⚖️ 경매" },
];

export default function Header() {
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
        <nav className="flex items-center gap-1 text-sm">
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
      </div>
    </header>
  );
}
