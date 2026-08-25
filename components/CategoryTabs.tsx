import Link from "next/link";
import { CATEGORIES } from "@/lib/types";
import { homeHref } from "@/lib/nav";

const SHOPPING = CATEGORIES.filter((c) => c.dealType === "shopping");
const FLIGHT = CATEGORIES.find((c) => c.dealType === "flight");
const AUCTION = CATEGORIES.find((c) => c.dealType === "auction");

export default function CategoryTabs({
  active,
  sort,
  hot,
  q,
}: {
  active?: string;
  sort: string;
  hot: boolean;
  q?: string;
}) {
  const base =
    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition";
  const on = "bg-brand text-white";
  const off = "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50";

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2">
      <Link
        href={homeHref({ sort, hot, q })}
        className={`${base} ${!active ? on : off}`}
      >
        전체
      </Link>
      {SHOPPING.map((c) => (
        <Link
          key={c.slug}
          href={homeHref({ category: c.slug, sort, hot, q })}
          className={`${base} ${active === c.slug ? on : off}`}
        >
          {c.name}
        </Link>
      ))}
      {FLIGHT && (
        <Link
          href={`/?category=${FLIGHT.slug}`}
          className={`${base} ${active === FLIGHT.slug ? on : off}`}
        >
          {FLIGHT.name}
        </Link>
      )}
      {AUCTION && (
        <Link
          href={`/?category=${AUCTION.slug}`}
          className={`${base} ${active === AUCTION.slug ? on : off}`}
        >
          {AUCTION.name}
        </Link>
      )}
    </nav>
  );
}
