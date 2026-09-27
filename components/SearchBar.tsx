"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    startTransition(() => router.push(term ? `/?q=${encodeURIComponent(term)}` : "/"));
  }

  return (
    <form onSubmit={submit} className="relative" aria-busy={pending}>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="SSD, 에어팟, 쌀, 기저귀 검색"
        aria-label="상품 검색"
        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-16 text-sm outline-none focus:border-brand"
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        🔍
      </span>
      <button type="submit" disabled={pending} className="absolute right-1.5 top-1/2 min-h-8 -translate-y-1/2 rounded-md px-2 text-xs font-bold text-brand disabled:text-gray-400">
        {pending ? "검색 중" : "검색"}
      </button>
    </form>
  );
}
