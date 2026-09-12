import type { Metadata } from "next";
import Home from "../page";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "검증된 베스트딜",
  description: "판매자 할인율이 아니라 실제 가격 이력과 DROP SCORE로 검증한 베스트딜을 확인하세요.",
  alternates: { canonical: `${SITE_URL}/deals` },
};

export default function DealsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  return <Home searchParams={{ ...searchParams, sec: "best" }} />;
}
