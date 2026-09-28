import type { Metadata } from "next";
import TrackedProductCatalog from "@/components/TrackedProductCatalog";
import { getRecentlyTrackedProducts } from "@/lib/products";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "가격 추적 상품 전체",
  description: "여러 판매처에서 가격을 수집 중인 상품을 판매처·카테고리별로 검색하고 현재가와 가격 이력을 비교하세요.",
  alternates: { canonical: "/tracking" },
};

export default async function TrackingPage() {
  const rows = await getRecentlyTrackedProducts(240);
  const malls = new Set(rows.map((row) => row.mallName ?? row.platform));
  return <div>
    <header className="mb-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-brand">PRICE TRACKING</p>
      <h1 className="mt-1 text-2xl font-black text-gray-950">가격 추적 상품 전체</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">핫딜 판정 전 상품도 숨기지 않고 보여드립니다. 현재 {malls.size}개 판매처의 중복 제거 상품 {rows.length}개를 검색할 수 있으며, 각 상품에서 실제 수집 가격과 관측 기간을 확인할 수 있습니다.</p>
    </header>
    <TrackedProductCatalog rows={rows} />
  </div>;
}
