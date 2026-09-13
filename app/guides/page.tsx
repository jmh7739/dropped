import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "가격 비교 가이드",
  description: "정가 할인율, 가격 이력, DROP SCORE, 쿠폰·옵션·해외직구 비용을 읽는 방법을 알아보세요.",
  alternates: { canonical: `${SITE_URL}/guides` },
};

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "가격 비교 가이드" }]} />
      <h1 className="text-2xl font-extrabold">가격 비교 가이드</h1>
      <p className="mt-3 text-base leading-7 text-gray-600">
        가격이 내려갔다는 표시만으로 살 때를 결정하기는 어렵습니다. 떨어졌다의 가격 이력을
        읽는 방법과 결제 전 확인할 조건을 주제별로 정리했습니다.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <Link key={guide.slug} href={`/guides/${guide.slug}`} className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-brand/40 hover:shadow-sm">
            <h2 className="text-base font-bold text-gray-900">{guide.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{guide.description}</p>
            <span className="mt-3 inline-block text-sm font-bold text-brand">읽어보기 →</span>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-500">
        실제 상품 가격과 추적 일수는 <Link href="/" className="font-bold text-brand hover:underline">상품 검색</Link>에서 확인할 수 있습니다.
      </p>
    </div>
  );
}
