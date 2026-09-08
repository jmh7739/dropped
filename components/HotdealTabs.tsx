import Link from "next/link";
import { homeHref } from "@/lib/nav";
import { SortKey } from "@/lib/deals";

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
    { key: "drop" as const, label: "📉 급락딜", desc: "평소보다 떨어진 가격", href: homeHref({ ...drop }) },
    { key: "best" as const, label: "🛒 베스트딜", desc: "국내몰 인기 세일", href: homeHref({ sec: "best", ...best }) },
  ];
  return (
    <div className="mb-5 flex gap-2">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-4 py-2.5 text-center transition ${
            sec === t.key
              ? "bg-brand text-white shadow-md"
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <span className="text-sm font-extrabold">{t.label}</span>
          <span className={`text-[11px] ${sec === t.key ? "text-white/80" : "text-gray-400"}`}>
            {t.desc}
          </span>
        </Link>
      ))}
    </div>
  );
}
