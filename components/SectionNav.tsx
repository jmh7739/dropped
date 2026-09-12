"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const SECTIONS = [
  { href: "/", label: "핫딜", key: "hotdeal" },
  { href: "/?category=flight", label: "여행딜", key: "travel" },
] as const;

export default function SectionNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname === "/" && searchParams.get("category") === "flight"
    ? "travel"
    : pathname === "/"
      ? "hotdeal"
      : null;

  return (
    <nav className="flex items-center gap-1.5" aria-label="주요 섹션">
      {SECTIONS.map((section) => (
        <Link
          key={section.key}
          href={section.href}
          aria-current={active === section.key ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-extrabold transition ${
            active === section.key
              ? "bg-brand text-white shadow-sm"
              : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          {section.key === "hotdeal" ? "🔥 " : "✈️ "}{section.label}
        </Link>
      ))}
    </nav>
  );
}
