import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import AffiliateDisclosure from "@/components/AffiliateDisclosure";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "떨어졌다 — 가격 이력으로 확인하는 특가·핫딜",
    template: "%s | 떨어졌다",
  },
  description:
    "수집한 가격 이력으로 쇼핑 상품의 현재가와 평소 가격을 비교합니다. 추적 기간, DROP SCORE, 가격 그래프를 확인하고 항공권 조회 정보도 살펴보세요.",
  keywords: [
    "핫딜", "특가", "가격비교", "최저가", "할인", "떨어졌다",
    "알리익스프레스 특가", "쿠팡 특가", "오늘의 특가", "항공권 특가",
    "항공권 최저가", "가격 그래프", "가격 이력", "DROP SCORE", "핫딜 모음",
  ],
  openGraph: {
    title: "떨어졌다 — 가격 이력으로 확인하는 특가·핫딜",
    description:
      "쇼핑 상품의 가격 이력과 추적 기간을 확인하고, 항공권 조회 정보도 살펴보세요.",
    type: "website",
    locale: "ko_KR",
    siteName: "떨어졌다",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "떨어졌다 — 진짜 싸진 것만 모으는 특가·핫딜",
    description: "쇼핑 상품의 가격 이력과 추적 기간을 확인하고, 항공권 조회 정보도 살펴보세요.",
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
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
        <AffiliateDisclosure />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-JWW2TT83XK" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-JWW2TT83XK');`}
        </Script>
        <Analytics />
      </body>
    </html>
  );
}
