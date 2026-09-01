import Link from "next/link";
import { homeHref } from "@/lib/nav";
import { SortKey } from "@/lib/deals";

/**
 * 핫딜 세그먼트: 📉 급락(가격 추적으로 떨어진 것) | 🛒 베스트(국내몰 인기 세일).
 *   같은 "특가"가 아니라 '떨어짐 vs 잘팔림'으로 성격을 갈라 안 헷갈리게.
 */
export default function HotdealTabs({
  sec,
  drop,
  best,
}: {
  sec: "drop" | "best";
  drop: { category?: string; sort?: SortKey; hot?: boolean; q?: string; showEnded?: boolean; ps?: string };
  best: { cc?: string; cs?: string };
}) {
  const tabs = [
    { key: "drop" as const, label: "📉 급락딜", href: homeHref({ ...drop }) },
    { key: "best" as const, label: "🛒 베스트딜", href: homeHref({ sec: "best", ...best }) },
  ];
  return (
    <div className="mb-4 flex gap-2">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
            sec === t.key
              ? "bg-brand text-white shadow-sm"
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
