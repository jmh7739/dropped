import Script from "next/script";

/** 사이트 소유 확인용 광고 코드. 자체 콘텐츠가 충분한 페이지에서만 렌더한다. */
export default function AdSenseScript() {
  return (
    <Script
      id="adsbygoogle-init"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8157291840297932"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      async
    />
  );
}
