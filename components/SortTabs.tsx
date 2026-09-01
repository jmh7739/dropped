import Link from "next/link";
import { homeHref } from "@/lib/nav";
import { DEAL_SORTS } from "@/lib/deals";
import SortDropdown from "./SortDropdown";

export default function SortTabs({
  category,
  sort,
  hot,
  q,
  showEnded,
  ps,
  cc,
  cs,
}: {
  category?: string;
  sort: string;
  hot: boolean;
  q?: string;
  showEnded: boolean;
  ps?: string;
  cc?: string;
  cs?: string;
}) {
  // 정렬 드롭다운이 유지할 다른 쿼리 (page는 1로 리셋 → 생략)
  const keep: Record<string, string> = {};
  if (category) keep.category = category;
  if (hot) keep.hot = "1";
  if (q) keep.q = q;
  if (showEnded) keep.se = "1";
  if (ps) keep.ps = ps;
  if (cc) keep.cc = cc;
  if (cs && cs !== "recent") keep.cs = cs;

  return (
    <div className="flex items-center gap-2">
      {/* 인기딜만 필터 토글 */}
      <Link
        href={homeHref({ category, sort, hot: !hot, q, showEnded, ps, cc, cs })}
        className={`flex-shrink-0 rounded-full px-2.5 py-1.5 text-xs font-bold transition ${
          hot
            ? "bg-brand text-white"
            : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        }`}
      >
        🔥 인기딜만
      </Link>
      {/* 정렬 드롭다운 (우측) */}
      <SortDropdown options={DEAL_SORTS} value={sort} param="sort" params={keep} />
    </div>
  );
}
