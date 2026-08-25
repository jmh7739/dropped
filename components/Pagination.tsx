import Link from "next/link";
import { homeHref } from "@/lib/nav";

export default function Pagination({
  page,
  totalPages,
  base,
}: {
  page: number;
  totalPages: number;
  base: { category?: string; sort?: string; hot?: boolean; q?: string };
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  );

  const cls = (active: boolean) =>
    `min-w-8 rounded-md px-2.5 py-1.5 text-center text-sm ${
      active
        ? "bg-brand font-bold text-white"
        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <nav className="mt-6 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={homeHref({ ...base, page: page - 1 })} className={cls(false)}>
          이전
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1] !== p - 1 && (
            <span className="text-gray-300">…</span>
          )}
          <Link href={homeHref({ ...base, page: p })} className={cls(p === page)}>
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={homeHref({ ...base, page: page + 1 })} className={cls(false)}>
          다음
        </Link>
      )}
    </nav>
  );
}
