/**
 * 태극기 아이콘 (SVG). 국기 이모지(🇰🇷)가 Windows에서 "KR"로 깨지는 문제를
 * 피하려고 직접 그린다. 어디서나 동일하게 렌더된다.
 */
export default function KoreaFlag({ className = "" }: { className?: string }) {
  // 각 괘: true=이어진 막대, false=끊어진 막대 (위→아래 3개)
  const gwe: Record<string, boolean[]> = {
    geon: [true, true, true], // 건 ☰ (좌상)
    ri: [true, false, true], // 리 ☲ (좌하)
    gam: [false, true, false], // 감 ☵ (우상)
    gon: [false, false, false], // 곤 ☷ (우하)
  };

  function bars(cx: number, cy: number, kind: boolean[]) {
    const w = 6.4;
    const h = 1.1;
    const gap = 2.0;
    return kind.flatMap((solid, i) => {
      const y = cy - gap + i * gap - h / 2;
      if (solid) {
        return [<rect key={i} x={cx - w / 2} y={y} width={w} height={h} rx={0.3} fill="#111" />];
      }
      const seg = (w - 1.8) / 2;
      return [
        <rect key={`${i}a`} x={cx - w / 2} y={y} width={seg} height={h} rx={0.3} fill="#111" />,
        <rect key={`${i}b`} x={cx + w / 2 - seg} y={y} width={seg} height={h} rx={0.3} fill="#111" />,
      ];
    });
  }

  return (
    <svg viewBox="0 0 36 24" className={className} role="img" aria-label="대한민국">
      <rect x="0.5" y="0.5" width="35" height="23" rx="3" fill="#fff" stroke="#e5e7eb" />
      {/* 태극 */}
      <circle cx="18" cy="12" r="6" fill="#0047A0" />
      <path
        d="M18 6 a6 6 0 0 1 0 12 a3 3 0 0 1 0 -6 a3 3 0 0 0 0 -6 z"
        fill="#CD2E3A"
      />
      {/* 4괘 */}
      {bars(7, 6, gwe.geon)}
      {bars(7, 18, gwe.ri)}
      {bars(29, 6, gwe.gam)}
      {bars(29, 18, gwe.gon)}
    </svg>
  );
}
