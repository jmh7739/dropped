import type { Metadata } from "next";
import Home from "../page";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "추적 최저가",
  description: "실제 추적 기간 동안 가장 낮아진 상품 가격을 확인하세요. 90일 데이터가 있는 상품만 90일 최저가로 표시합니다.",
  alternates: { canonical: `${SITE_URL}/lowest-price` },
};

export default function LowestPricePage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  return <Home searchParams={{ ...searchParams, ps: "lowest" }} />;
}
