import type { Metadata } from "next";
import Link from "next/link";
import UnitPriceCalculator from "./unit-price-calculator";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "100g·1개당 가격 비교 계산기 | Dropped",
  description: "묶음 수량, 내용량, 배송비를 같은 단위로 맞춰 두 상품의 실제 단위가격을 비교합니다.",
  alternates: { canonical: `${SITE_URL}/unit-price` },
};

export default function UnitPricePage() {
  return <main className="mx-auto max-w-3xl space-y-7 px-4 py-8 text-gray-800">
    <nav className="text-sm"><Link href="/" className="text-brand underline">가격 추적 상품</Link> / 단위가격 비교</nav>
    <header>
      <h1 className="text-3xl font-extrabold text-gray-950">묶음상품, 100g·1개당 가격으로 비교하세요</h1>
      <p className="mt-3 leading-7">표시 가격이 낮아도 중량·개수와 배송비가 다르면 실제로 더 비쌀 수 있습니다. 두 상품의 결제 조건을 같은 단위로 바꿔 비교합니다.</p>
    </header>
    <UnitPriceCalculator />
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-xl font-bold">계산할 때 확인할 것</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 leading-7">
        <li>옵션에서 선택한 한 묶음의 실제 내용량 또는 개수를 입력하세요. 500g 2팩이면 수량 2, 팩당 내용량 500g입니다.</li>
        <li>쿠폰을 이미 적용한 가격이라면 할인 후 결제액을 넣고, 별도 배송비를 더하세요. 카드 조건이나 최소 주문금액은 직접 확인해야 합니다.</li>
        <li>중량은 중량끼리, 개수는 개수끼리 비교하세요. 품질·원산지·유통기한이 다르면 단위가격만으로 구매를 결정하지 마세요.</li>
      </ol>
    </section>
    <nav className="flex flex-wrap gap-3 text-sm font-bold">
      <Link href="/guides/food-unit-price" className="rounded-lg border px-4 py-3 text-brand">식품 묶음상품 비교 방법</Link>
      <Link href="/tracking" className="rounded-lg border px-4 py-3 text-brand">실제 가격 이력 상품 보기</Link>
    </nav>
  </main>;
}
