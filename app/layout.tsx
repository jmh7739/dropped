import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import AffiliateDisclosure from "@/components/AffiliateDisclosure";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://dropped.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "떨어졌다 — 가격 급락 핫딜·항공권·경매 특가",
    template: "%s | 떨어졌다",
  },
  description:
    "쿠팡·알리익스프레스 가격 급락 특가, 항공권 최저가, 법원경매까지 자동으로 모아 보여줍니다. 평소 가격 대비 얼마나 싼지 그래프로 한눈에.",
  keywords: [
    "핫딜", "특가", "가격비교", "알리익스프레스", "쿠팡", "항공권 특가",
    "최저가", "할인", "떨어졌다", "경매",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "떨어졌다 — 가격 급락 핫딜·항공권·경매 특가",
    description:
      "평소 대비 급락한 특가만 골라서. 가격 변동 그래프로 진짜 싼지 확인하세요.",
    type: "website",
    locale: "ko_KR",
    siteName: "떨어졌다",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "떨어졌다 — 가격 급락 핫딜 모음",
    description: "평소 대비 급락한 특가만 골라서.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Travelpayouts Drive (여행 링크 자동 제휴 전환) */}
        <Script
          src="https://tp-em.com/NTY2NTY1.js?t=566565"
          strategy="afterInteractive"
          data-cmp-ab="2"
        />
      </head>
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
