import Link from "next/link";

const NAV = [
  { href: "/", label: "핫딜" },
  { href: "/?category=flight", label: "✈️ 항공권" },
  { href: "/?category=auction", label: "⚖️ 경매" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-2xl leading-none text-brand">🔻</span>
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
