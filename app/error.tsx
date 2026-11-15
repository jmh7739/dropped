"use client";

import Link from "next/link";

const LINKS = [
  ["/guides", "가격 비교 가이드", "평균가·최저가를 읽는 법과 판단이 틀리는 경우"],
  ["/insights", "실제 가격 추적 사례", "기록이 쌓인 상품에서 가격이 어떻게 움직였는지"],
  ["/store-deals", "마트·편의점 행사", "1+1·2+1을 총액과 개당 가격으로 비교"],
  ["/unit-price", "단위가격 계산기", "100g·1개당 가격을 직접 계산"],
] as const;

/**
 * Shown when a data-backed section cannot be rendered. The page still leads
 * with useful content; the short note about the delay comes after it.
 * data-render-error lets the static build retry this page later.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div data-render-error="1" className="mx-auto max-w-3xl py-6">
      <h1 className="text-2xl font-black text-gray-950">가격 이력으로 진짜 할인을 확인하는 방법</h1>
      <p className="mt-3 text-base leading-7 text-gray-700">
        Dropped는 판매처가 적은 정가 할인율 대신 직접 기록한 가격 이력과 지금 가격을 비교합니다. 하루에 여러 번 확인한
        가격을 날짜별 대표가격으로 줄이고, 최근 30일 평균과 추적 기간 최저가에 견줘 평소보다 싼지 봅니다.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {LINKS.map(([href, title, copy]) => (
          <li key={href}>
            <Link href={href} className="block min-h-11 rounded-xl border border-gray-200 bg-white p-4 hover:border-red-300">
              <strong className="text-base text-gray-950">{title} →</strong>
              <span className="mt-1 block text-sm leading-6 text-gray-700">{copy}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm leading-6 text-gray-600">
        이 화면의 상품 목록은 잠시 표시되지 않았습니다.{" "}
        <button type="button" onClick={reset} className="font-bold text-brand underline">목록 다시 보기</button>
      </p>
    </div>
  );
}
