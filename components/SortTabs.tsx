import Link from "next/link";
import { homeHref } from "@/lib/nav";
import { DEAL_SORTS } from "@/lib/deals";
import SortDropdown from "./SortDropdown";

export default function SortTabs({
  category,
  sort,
  hot,
  q,
  hideEnded,
}: {
  category?: string;
  sort: string;
  hot: boolean;
  q?: string;
  hideEnded: boolean;
}) {
  // 정렬 드롭다운이 유지할 다른 쿼리 (page는 1로 리셋 → 생략)
  const keep: Record<string, string> = {};
  if (category) keep.category = category;
  if (hot) keep.hot = "1";
  if (q) keep.q = q;
  if (hideEnded) keep.he = "1";

  return (
    <div className="flex items-center gap-2">
      {/* 인기딜만 필터 토글 */}
      <Link
        href={homeHref({ category, sort, hot: !hot, q, hideEnded })}
        className={`flex-shrink-0 rounded-full px-2.5 py-1.5 text-xs font-bold transition ${
          hot
            ? "bg-brand text-white"
            : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        }`}
      >
        🔥 인기딜만
      </Link>
      {/* 종료딜 숨기기 토글 */}
      <Link
        href={homeHref({ category, sort, hot, q, hideEnded: !hideEnded })}
        className={`flex-shrink-0 rounded-full px-2.5 py-1.5 text-xs font-bold transition ${
          hideEnded
            ? "bg-brand text-white"
            : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        }`}
      >
        {hideEnded ? "☑" : "☐"} 종료딜 숨기기
      </Link>
      {/* 정렬 드롭다운 (우측) */}
      <SortDropdown options={DEAL_SORTS} value={sort} param="sort" params={keep} />
    </div>
  );
}
