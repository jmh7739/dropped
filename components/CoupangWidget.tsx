"use client";

import { useEffect, useRef } from "react";

/**
 * 쿠팡 파트너스 다이나믹 배너(자동 상품 캐러셀).
 *   파트너스에서 위젯 생성 후 받은 id를 NEXT_PUBLIC_COUPANG_DYNAMIC_ID 로 넣으면 노출.
 *   id 없으면 아무것도 렌더 안 함(설정 전엔 조용히 숨김).
 *   ⚠️ 쿠팡 정책상 "쿠팡 파트너스 활동으로 수수료를 제공받음" 고지 필요 → 하단 문구로 안내.
 */
export default function CoupangWidget({
  id,
  height = 140,
}: {
  id?: string;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = ref.current;
    if (!box || !id) return;
    box.innerHTML = "";
    const loader = document.createElement("script");
    loader.src = "https://ads-partners.coupang.com/g.js";
    loader.async = true;
    loader.onload = () => {
      const w = document.createElement("script");
      // 컨테이너 폭에 맞춘 반응형. 생성 스크립트가 iframe을 이 div 안에 넣는다.
      w.text = `new PartnersCoupang.G({ id: ${Number(id)}, width: "100%", height: ${height}, bordered: false });`;
      box.appendChild(w);
    };
    box.appendChild(loader);
    return () => {
      box.innerHTML = "";
    };
  }, [id, height]);

  if (!id) return null;

  return (
    <section className="my-6">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-base font-extrabold text-gray-900">🛒 쿠팡 추천</h2>
      </div>
      <div
        ref={ref}
        className="overflow-hidden rounded-xl border border-gray-200 bg-white"
        style={{ minHeight: height }}
      />
      <p className="mt-1 text-[11px] text-gray-400">
        이 영역은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </section>
  );
}
