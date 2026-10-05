import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '농산물 공공 기준가격',
  description: '공식 도매·소매 조사 가격을 판매상품 가격과 구분해 확인합니다.',
  robots: { index: false, follow: true },
};

type Row = Record<string, unknown>;
const FEED = 'https://raw.githubusercontent.com/jmh7739/dropped/main/marketbot-data/public-feed.json';

async function prices() {
  try {
    const response = await fetch(FEED, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const root = await response.json() as { marketPrices?: { checkedAt?: string; items?: Row[] } };
    const group = root.marketPrices;
    const checked = Date.parse(group?.checkedAt || '');
    if (!Number.isFinite(checked) || checked > Date.now() + 60_000 ||
        Date.now() - checked > 48 * 3600_000 || !Array.isArray(group?.items)) return null;
    const rows = group.items.filter(row => /^20\d{6}$/.test(String(row.exmn_ymd || '')) &&
      String(row.item_nm || '').trim() && Number(row.exmn_dd_prc) > 0 &&
      String(row.se_nm || '').trim() && String(row.unit || '').trim());
    return rows.length ? rows : null;
  } catch { return null; }
}

export default async function MarketPricesPage() {
  const rows = await prices();
  return <div className="mx-auto max-w-4xl space-y-5 py-6">
    <Link href="/" className="text-sm font-semibold text-red-600">← 특가 목록</Link>
    <div>
      <h1 className="text-3xl font-extrabold">농산물 공공 기준가격</h1>
      <p className="mt-2 text-gray-600">한국농수산식품유통공사의 시장 조사값입니다. 쇼핑몰 판매가·배송비·쿠폰가와 직접 비교할 수 없으며 핫딜 판정에는 사용하지 않습니다.</p>
    </div>
    {!rows ? <div className="rounded-xl border bg-gray-50 p-5">현재 확인 가능한 최신 조사 가격이 없습니다. 기존 상품 가격이력은 계속 확인할 수 있습니다.</div>
      : <>
        <p className="text-sm text-gray-500">최근 조사 자료 {rows.length}건 · 시장·품종·등급·단위별 별도 가격</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.slice(0, 40).map((row, index) => <article key={`${row.exmn_ymd}-${row.item_cd}-${row.mrkt_cd}-${index}`} className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between gap-3"><h2 className="font-bold">{String(row.item_nm)}</h2><span className="text-xs text-gray-500">{String(row.exmn_ymd).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3')}</span></div>
            <p className="mt-2 text-xl font-extrabold">{Number(row.exmn_dd_prc).toLocaleString('ko-KR')}원 <span className="text-sm font-normal text-gray-600">/ {String(row.unit)}</span></p>
            <p className="mt-1 text-sm text-gray-600">{[row.se_nm, row.mrkt_nm, row.vrty_nm, row.grd_nm].filter(Boolean).map(String).join(' · ')}</p>
          </article>)}
        </div>
      </>}
    <a href="https://www.data.go.kr/data/15156057/openapi.do" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-red-600 underline">공식 데이터 출처 확인</a>
  </div>;
}
