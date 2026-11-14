"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-950">상품 정보를 불러오지 못했습니다</h1>
      <p className="mt-4 text-sm leading-6 text-gray-700">
        가격 조회가 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요.
      </p>
      <button type="button" onClick={reset} className="mt-6 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white">
        다시 시도
      </button>
    </div>
  );
}
