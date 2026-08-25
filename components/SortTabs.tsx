import Link from "next/link";
import { homeHref } from "@/lib/nav";

export default function SortTabs({
  category,
  sort,
  hot,
  q,
}: {
  category?: string;
  sort: string;
  hot: boolean;
  q?: string;
}) {
  const items = [
    { key: "discount", label: "하락률순" },
    { key: "recent", label: "최신순" },
  ];
  return (
    <div className="flex items-center gap-2 text-sm">
      {/* 인기딜 필터 토글 */}
      <Link
        href={homeHref({ category, sort, hot: !hot, q })}
        className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
          hot
            ? "bg-brand text-white"
            : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        }`}
      >
        🔥 인기딜만
      </Link>
      <span className="text-gray-200">|</span>
      {items.map((it, i) => (
        <span key={it.key} className="flex items-center gap-2">
          {i > 0 && <span className="text-gray-300">·</span>}
          <Link
            href={homeHref({ category, sort: it.key, hot, q })}
            className={
              sort === it.key
                ? "font-bold text-gray-900"
                : "text-gray-400 hover:text-gray-600"
            }
          >
            {it.label}
          </Link>
        </span>
      ))}
    </div>
  );
}
