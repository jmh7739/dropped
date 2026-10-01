"use client";

import { useMemo, useState } from "react";
import { PricePoint } from "@/lib/types";
import { formatWon } from "@/lib/format";
import { dailyPricePoints } from "@/lib/priceReport";

/**
 * 의존성 없는 SVG 가격 변동 그래프 (다나와 스타일).
 * - 회색 선: 가격 추이
 * - 점선: 기간 평균가
 * - 빨간 점: 현재가
 * - 초록 점: 역대 최저가
 */
export default function PriceChart({
  history,
  width = 640,
  height = 220,
}: {
  history: PricePoint[];
  width?: number;
  height?: number;
}) {
  const [range, setRange] = useState<7 | 30 | 90 | "all">(30);
  const filtered = useMemo(() => {
    const daily = dailyPricePoints(history);
    if (range === "all") return daily;
    return daily.filter(
      (h) => Date.now() - new Date(h.collectedAt).getTime() <= range * 86400000
    );
  }, [history, range]);
  const chartHistory = filtered;

  if (chartHistory.length < 2) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-400">
        선택한 기간의 가격 이력이 부족합니다. <button type="button" onClick={() => setRange("all")} className="underline">전체 기간 보기</button>
      </div>
    );
  }

  const padX = 8;
  const padTop = 16;
  const padBottom = 24;
  const w = width;
  const h = height;

  const prices = chartHistory.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const priceRange = max - min || 1;
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  const n = chartHistory.length;
  const x = (i: number) =>
    padX + (i / (n - 1)) * (w - padX * 2);
  const y = (price: number) =>
    padTop + (1 - (price - min) / priceRange) * (h - padTop - padBottom);

  const linePath = chartHistory
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.price).toFixed(1)}`)
    .join(" ");

  const areaPath =
    `${linePath} L ${x(n - 1).toFixed(1)} ${(h - padBottom).toFixed(1)}` +
    ` L ${x(0).toFixed(1)} ${(h - padBottom).toFixed(1)} Z`;

  const lastIdx = n - 1;
  const minIdx = prices.indexOf(min);
  const latestPoint = chartHistory[lastIdx];
  const latestLabel = new Date(latestPoint.collectedAt).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
  const newest = Math.max(...history.map((item) => new Date(item.collectedAt).getTime()));
  const options: { label: string; value: 7 | 30 | 90 | "all" }[] = [
    ...([7, 30, 90] as const).map(days => ({ label: `${days}일`, value: days })),
    { label: "전체", value: "all" },
  ];

  return (
    <div>
      <p className="mb-2 text-xs text-gray-500">한국 날짜별 중앙값을 하루 대표가격으로 사용합니다. 최근 30일 평균은 상세 통계와 같은 기준입니다. 마지막 점은 해당 날짜의 대표가격입니다.</p>
      {options.length > 1 && <div className="mb-3 flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => setRange(option.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
              range === option.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>}
      <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        role="img"
        aria-label="가격 변동 그래프"
      >
        {/* 평균선 */}
        <line
          x1={padX}
          x2={w - padX}
          y1={y(avg)}
          y2={y(avg)}
          stroke="#9ca3af"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <text x={padX} y={y(avg) - 4} fontSize="10" fill="#9ca3af">
          표시 구간 평균 {formatWon(avg)}
        </text>

        {/* 채움 영역 */}
        <path d={areaPath} fill="#fee2e2" opacity={0.5} />
        {/* 가격 선 */}
        <path d={linePath} fill="none" stroke="#ef4444" strokeWidth={2} />

        {/* 역대 최저 점 */}
        <circle cx={x(minIdx)} cy={y(min)} r={4} fill="#16a34a" />
        {/* 현재가 점 */}
        <circle cx={x(lastIdx)} cy={y(chartHistory[lastIdx].price)} r={4} fill="#ef4444" />

        {/* 축 라벨 (처음/끝 날짜) */}
        <text x={padX} y={h - 6} fontSize="10" fill="#9ca3af">
          {new Date(chartHistory[0].collectedAt).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
          })}
        </text>
        <text
          x={w - padX}
          y={h - 6}
          fontSize="10"
          fill="#9ca3af"
          textAnchor="end"
        >
          {latestLabel}
        </text>
      </svg>
      <div className="mt-1 flex gap-4 text-xs text-gray-500">
        <span>
          <span className="text-green-600">●</span> 기간 내 최저 {formatWon(min)}
        </span>
        <span>
          <span className="text-gray-400">┈</span> 표시 구간 평균 {formatWon(avg)}
        </span>
        <span>
          <span className="text-brand">●</span> 마지막 날짜 대표가격 {formatWon(chartHistory[lastIdx].price)}
        </span>
      </div>
      </div>
    </div>
  );
}
