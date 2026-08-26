"use client";

import { useRouter } from "next/navigation";

/**
 * 우측 정렬 드롭다운. 선택하면 URL의 `param`만 바꿔 이동한다.
 * `params`는 유지할 다른 쿼리(카테고리·필터 등). 정렬 바꾸면 page는 1로(생략).
 */
export default function SortDropdown({
  options,
  value,
  param,
  params,
  className = "",
}: {
  options: { key: string; label: string }[];
  value: string;
  param: string;
  params: Record<string, string>;
  className?: string;
}) {
  const router = useRouter();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        aria-label="정렬"
        value={value}
        onChange={(e) => {
          const sp = new URLSearchParams(params);
          sp.set(param, e.target.value);
          router.push(`/?${sp.toString()}`);
        }}
        className="cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-gray-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
