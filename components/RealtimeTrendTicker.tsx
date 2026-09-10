"use client";

import { useEffect, useState } from "react";
import type { RealtimeTrend } from "@/lib/trends";

function Movement({ trend }: { trend: RealtimeTrend }) {
  if (trend.status === "NEW") return <span className="font-extrabold text-brand">NEW</span>;
  if (trend.status === "up") return <span className="font-bold text-red-500">▲{trend.rankChange}</span>;
  if (trend.status === "down") return <span className="font-bold text-blue-500">▼{Math.abs(trend.rankChange || 0)}</span>;
  return <span className="font-bold text-gray-400">-</span>;
}

function TrendLink({ trend, compact = false }: { trend: RealtimeTrend; compact?: boolean }) {
  const content = <><strong className={compact ? "w-8 text-gray-900" : "text-brand"}>{trend.rank}위</strong><span className="min-w-0 flex-1 truncate">{trend.keyword}</span><Movement trend={trend} /></>;
  return trend.affiliateUrl ? (
    <a href={trend.affiliateUrl} target="_blank" rel="nofollow sponsored noopener" className="flex min-w-0 items-center gap-2 hover:text-brand">{content}</a>
  ) : (
    <span className="flex min-w-0 items-center gap-2 text-gray-400" title="제휴 링크 생성 대기 중">{content}</span>
  );
}

export default function RealtimeTrendTicker({ trends, intervalMs = 2500 }: { trends: RealtimeTrend[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<0 | 1>(0);
  useEffect(() => {
    if (open || trends.length < 2) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % trends.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [open, trends.length, intervalMs]);
  if (!trends.length) return null;
  const visible = trends.slice(page * 10, page * 10 + 10);
  return (
    <div className="relative ml-auto w-[min(320px,48vw)]" onMouseEnter={() => setOpen(true)} onMouseLeave={() => { setOpen(false); setPage(0); }}>
      <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs" onClick={() => setOpen(value => !value)} aria-expanded={open}>
        <span className="shrink-0 font-extrabold text-gray-700">실시간 인기</span>
        <span className="min-w-0 flex-1"><TrendLink trend={trends[index]} /></span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-full min-w-[280px] rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
          <ol className="space-y-0.5">
            {visible.map(trend => <li key={trend.normalizedKeyword} className="rounded-lg px-2.5 py-2 text-sm hover:bg-gray-50"><TrendLink trend={trend} compact /></li>)}
          </ol>
          {trends.length > 10 && <button type="button" className="mt-1 w-full border-t border-gray-100 px-2 py-2 text-right text-xs font-bold text-gray-500 hover:text-gray-900" onClick={() => setPage(value => value === 0 ? 1 : 0)}>{page === 0 ? "11~20위 보기 →" : "← 1~10위 보기"}</button>}
        </div>
      )}
    </div>
  );
}
