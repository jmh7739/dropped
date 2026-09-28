import type { Metadata } from "next";
import TrackedProductCatalog from "@/components/TrackedProductCatalog";
import { getRecentlyTrackedProducts } from "@/lib/products";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "전체 상품 둘러보기",
  description: "여러 판매처에서 가격을 수집 중인 상품을 판매처·카테고리별로 검색하고 현재가와 가격 이력을 비교하세요.",
  alternates: { canonical: "/tracking" },
};

export default async function TrackingPage() {
  const rows = await getRecentlyTrackedProducts(240);
  const malls = new Set(rows.map((row) => row.mallName ?? row.platform));
  return <div>
    <header className="mb-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-brand">PRODUCT CATALOG</p>
      <h1 className="mt-1 text-2xl font-black text-gray-950">전체 상품 둘러보기</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">핫딜 여부와 관계없이 가격을 확인 중인 상품을 모았습니다. 현재 {malls.size}개 판매처의 중복 제거 상품 {rows.length}개를 검색할 수 있으며, 각 상품에서 현재 확인가와 가격 기록을 볼 수 있습니다.</p>
    </header>
    <TrackedProductCatalog rows={rows} />
  </div>;
}
