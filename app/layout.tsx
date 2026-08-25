import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import AffiliateDisclosure from "@/components/AffiliateDisclosure";

export const metadata: Metadata = {
  title: "떨어졌다 — 가격 급락 핫딜 모음",
  description:
    "쿠팡·알리익스프레스의 가격 급락 특가를 자동으로 모아 보여줍니다. 평소 가격 대비 얼마나 싼지 그래프로 한눈에.",
  openGraph: {
    title: "떨어졌다 — 가격 급락 핫딜 모음",
    description:
      "평소 대비 급락한 특가만 골라서. 가격 변동 그래프로 진짜 싼지 확인하세요.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
        <AffiliateDisclosure />
      </body>
    </html>
  );
}
