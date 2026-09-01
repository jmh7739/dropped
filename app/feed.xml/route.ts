import { getDeals } from "@/lib/deals";
import { formatWon } from "@/lib/format";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dropped.kr";

// Supabase 읽기가 no-store라 요청 시 렌더(dynamic). 최신 딜을 항상 반영.
export const dynamic = "force-dynamic";

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const deals = (await getDeals({ sort: "recent" }))
    .filter((d) => d.status !== "ended")
    .slice(0, 40);

  const items = deals
    .map(
      (d) => `
    <item>
      <title>${esc(d.title)} — ${formatWon(d.currentPrice)}</title>
      <link>${SITE}/deal/${d.id}</link>
      <guid isPermaLink="true">${SITE}/deal/${d.id}</guid>
      <category>${esc(d.categoryName)}</category>
      <description>${esc(d.categoryName)} · ${formatWon(d.currentPrice)}${d.mallName ? ` · ${esc(d.mallName)}` : ""}</description>
      <pubDate>${new Date(d.detectedAt).toUTCString()}</pubDate>
    </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>떨어졌다 — 실시간 특가·핫딜</title>
    <link>${SITE}</link>
    <description>평소 판매가보다 진짜 싸진 특가만 모아드립니다.</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
