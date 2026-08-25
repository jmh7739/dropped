import { PricePoint } from "@/lib/types";
import { formatWon } from "@/lib/format";

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
  if (history.length < 2) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-400">
        가격 이력이 아직 부족합니다. 수집이 쌓이면 그래프가 표시됩니다.
      </div>
    );
  }

  const padX = 8;
  const padTop = 16;
  const padBottom = 24;
  const w = width;
  const h = height;

  const prices = history.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  const n = history.length;
  const x = (i: number) =>
    padX + (i / (n - 1)) * (w - padX * 2);
  const y = (price: number) =>
    padTop + (1 - (price - min) / range) * (h - padTop - padBottom);

  const linePath = history
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.price).toFixed(1)}`)
    .join(" ");

  const areaPath =
    `${linePath} L ${x(n - 1).toFixed(1)} ${(h - padBottom).toFixed(1)}` +
    ` L ${x(0).toFixed(1)} ${(h - padBottom).toFixed(1)} Z`;

  const lastIdx = n - 1;
  const minIdx = prices.indexOf(min);

  return (
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
          평균 {formatWon(avg)}
        </text>

        {/* 채움 영역 */}
        <path d={areaPath} fill="#fee2e2" opacity={0.5} />
        {/* 가격 선 */}
        <path d={linePath} fill="none" stroke="#ef4444" strokeWidth={2} />

        {/* 역대 최저 점 */}
        <circle cx={x(minIdx)} cy={y(min)} r={4} fill="#16a34a" />
        {/* 현재가 점 */}
        <circle cx={x(lastIdx)} cy={y(history[lastIdx].price)} r={4} fill="#ef4444" />

        {/* 축 라벨 (처음/끝 날짜) */}
        <text x={padX} y={h - 6} fontSize="10" fill="#9ca3af">
          {new Date(history[0].collectedAt).toLocaleDateString("ko-KR", {
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
          오늘
        </text>
      </svg>
      <div className="mt-1 flex gap-4 text-xs text-gray-500">
        <span>
          <span className="text-green-600">●</span> 역대최저 {formatWon(min)}
        </span>
        <span>
          <span className="text-gray-400">┈</span> 평균 {formatWon(avg)}
        </span>
        <span>
          <span className="text-brand">●</span> 현재 {formatWon(history[lastIdx].price)}
        </span>
      </div>
    </div>
  );
}
