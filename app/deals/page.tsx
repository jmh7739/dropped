import type { Metadata } from "next";
import Home from "../page";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "검증된 핫딜",
  description: "실제 가격 이력과 DROP SCORE를 기준으로 선별한 핫딜을 확인하세요.",
  // 루트 홈과 같은 목록·섹션을 재사용하므로 중복 랜딩으로 색인하지 않는다.
  alternates: { canonical: SITE_URL },
  robots: { index: false, follow: true },
};

export default async function DealsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <Home searchParams={Promise.resolve({ ...(await searchParams), sec: "best" })} />;
}
