import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl py-12 text-center">
      <h1 className="text-2xl font-extrabold text-gray-950">페이지를 찾을 수 없습니다</h1>
      <p className="mt-4 text-base leading-7 text-gray-700">
        주소가 바뀌었거나 추적이 끝난 상품일 수 있습니다. 아래에서 원하는 정보를 다시 찾아 주세요.
      </p>
      <nav aria-label="주요 페이지" className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-gray-950 px-4 text-sm font-bold text-white">홈으로</Link>
        <Link href="/price-drop" className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800">가격급락</Link>
        <Link href="/store-deals" className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800">마트·편의점</Link>
        <Link href="/guides" className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800">가이드</Link>
      </nav>
    </section>
  );
}
