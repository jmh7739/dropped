import type { Metadata } from "next";
import Home from "../page";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "지금 가격 급락",
  description: "판매자 정가가 아닌 실제 가격 이력의 평균보다 크게 떨어진 상품을 확인하세요.",
  alternates: { canonical: `${SITE_URL}/price-drop` },
};

export default function PriceDropPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  return <Home searchParams={{ ...searchParams, ps: "plunge" }} />;
}
