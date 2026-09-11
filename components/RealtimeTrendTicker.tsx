"use client";

import { useEffect, useState } from "react";
import type { RealtimeTrend } from "@/lib/trends";

const PAGE_SIZE = 10;

/** 순위 숫자 사각 배지 — 예전 네이버 실검처럼 1~3위는 빨강 강조. */
function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-extrabold tabular-nums ${
        rank <= 3 ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700"
      }`}
    >
      {rank}
    </span>
  );
}

/** 상승/하강/유지/NEW 표시. */
function Movement({ trend }: { trend: RealtimeTrend }) {
  if (trend.status === "NEW")
    return <span className="text-[11px] font-extrabold text-brand">NEW</span>;
  if (trend.status === "up")
    return <span className="text-[11px] font-bold text-red-500">▲{trend.rankChange}</span>;
  if (trend.status === "down")
    return <span className="text-[11px] font-bold text-blue-500">▼{Math.abs(trend.rankChange || 0)}</span>;
  return <span className="text-[11px] font-bold text-gray-400">동일</span>;
}

/** 순위/키워드/증감 한 줄. asLink=true면 제휴 검색으로 이동(펼친 목록에서만). */
function TrendRow({ trend, asLink }: { trend: RealtimeTrend; asLink?: boolean }) {
  const inner = (
    <>
      <RankBadge rank={trend.rank} />
      <span className="min-w-0 flex-1 truncate">{trend.keyword}</span>
      <Movement trend={trend} />
    </>
  );
  if (asLink && trend.affiliateUrl) {
    return (
      <a
        href={trend.affiliateUrl}
        target="_blank"
        rel="nofollow sponsored noopener"
        className="flex min-w-0 items-center gap-2 hover:text-brand"
      >
        {inner}
      </a>
    );
  }
  return <span className="flex min-w-0 items-center gap-2">{inner}</span>;
}

export default function RealtimeTrendTicker({
  trends,
  intervalMs = 2500,
}: {
  trends: RealtimeTrend[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  // 닫혀 있을 때만 1위부터 순서대로 한 줄씩 순환(네이버 실검 느낌).
  useEffect(() => {
    if (open || trends.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((v) => (v + 1) % trends.length),
      intervalMs
    );
    return () => window.clearInterval(timer);
  }, [open, trends.length, intervalMs]);

  if (!trends.length) return null;
  const current = trends[index] ?? trends[0];
  const pageCount = Math.ceil(trends.length / PAGE_SIZE);
  const visible = trends.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="relative ml-auto w-[min(320px,52vw)]">
      {/* 접힘 바: 탭하면 '펼침'만(이동 안 함). 목록에서 눌러야 이동. */}
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-left text-xs shadow-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex shrink-0 items-center gap-1 font-extrabold text-red-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
          실시간
        </span>
        <span className="min-w-0 flex-1">
          <TrendRow trend={current} />
        </span>
        <span
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          ⌄
        </span>
      </button>

      {open && (
        <>
          {/* 바깥 탭하면 닫힘 */}
          <div
            className="fixed inset-0 z-30"
            aria-hidden="true"
            onClick={() => {
              setOpen(false);
              setPage(0);
            }}
          />
          <div className="absolute right-0 top-full z-40 mt-1 w-full min-w-[280px] rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
            <div className="flex items-center justify-between px-1.5 pb-1.5">
              <span className="text-[11px] font-extrabold text-gray-700">실시간 급상승 검색어</span>
              <span className="text-[10px] text-gray-400">쇼핑 트렌드</span>
            </div>
            <ol className="space-y-0.5">
              {visible.map((trend) => (
                <li key={trend.normalizedKeyword} className="rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                  <TrendRow trend={trend} asLink />
                </li>
              ))}
            </ol>
            {pageCount > 1 && (
              <div className="mt-1.5 flex items-center justify-center gap-1 border-t border-gray-100 pt-1.5">
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    aria-current={page === i}
                    className={`h-6 w-6 rounded text-xs font-bold ${
                      page === i
                        ? "bg-brand text-white"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
