import { publicMarketPrices, referenceId } from '@/lib/publicMarketPrices';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^20\d{6}:(?:\d+:){4}\d+$/.test(id)) return Response.json({ error: 'invalid_id' }, { status: 400 });
  const rows = await publicMarketPrices();
  if (!rows) return Response.json({ error: 'reference_unavailable' }, { status: 503 });
  const row = rows.find(item => referenceId(item) === id);
  if (!row) return Response.json({ item: null }, { headers: { 'Cache-Control': 'no-store' } });
  return Response.json({ item: { id, name: row.item_nm, observedDate: String(row.exmn_ymd).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'),
    price: Number(row.exmn_dd_prc), market: row.mrkt_nm, unit: row.unit,
    source: '한국농수산식품유통공사 일별 도·소매 가격', priceRole: 'public_reference' } },
    { headers: { 'Cache-Control': 'no-store' } });
}
