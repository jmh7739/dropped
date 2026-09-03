import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Header from "@/components/Header";
import AffiliateDisclosure from "@/components/AffiliateDisclosure";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://dropped.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "떨어졌다 — 진짜 싸진 것만 모으는 특가·핫딜 (쿠팡·알리·항공권)",
    template: "%s | 떨어졌다",
  },
  description:
    "평소보다 진짜 싸진 것만 자동으로 골라주는 가격 판단 사이트. 쿠팡·알리익스프레스 급락 특가와 항공권 최저가를 실제 가격 이력, DROP SCORE, 가격 그래프로 확인하세요.",
  keywords: [
    "핫딜", "특가", "가격비교", "최저가", "할인", "떨어졌다",
    "알리익스프레스 특가", "쿠팡 특가", "오늘의 특가", "항공권 특가",
    "항공권 최저가", "가격 그래프", "가격 이력", "DROP SCORE", "핫딜 모음",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "떨어졌다 — 진짜 싸진 것만 모으는 특가·핫딜",
    description:
      "평소 판매가보다 진짜 싸진 것만. 쿠팡·알리 급락 특가와 항공권 최저가를 가격 이력과 DROP SCORE로 확인하세요.",
    type: "website",
    locale: "ko_KR",
    siteName: "떨어졌다",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "떨어졌다 — 진짜 싸진 것만 모으는 특가·핫딜",
    description: "평소 판매가보다 진짜 싸진 것만. 쿠팡·알리·항공권 특가를 가격 이력으로 판단합니다.",
  },
  verification: {
    google: "_M4_jKpnBbDWBSw5xH5hqFFVcH8Eh8BuvWV8EPk-X3I",
    other: {
      "naver-site-verification": [
        "19dea3a500e9d725247ef654d68aad7cceb258d4", // www.dropped.kr
        "393b3329ad2a6dc4d528c527ebfcd038c673c777", // dropped.kr (non-www)
      ],
    },
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
        <link
          rel="alternate"
          type="application/rss+xml"
          title="떨어졌다 특가"
          href="/feed.xml"
        />
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
        <Analytics />
      </body>
    </html>
  );
}
