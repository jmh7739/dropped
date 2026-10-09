import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function authorized(request: NextRequest) {
  const secret = process.env.MARKETBOT_PUBLISH_TOKEN;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

function adminDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = adminDb();
  if (!db) return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  const sourceId = request.nextUrl.searchParams.get('sourceId') || '';
  if (!/^lp_[a-z0-9_:-]{5,180}$/i.test(sourceId)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  const { data: product, error } = await db.from('products').select('id,title,product_url,affiliate_url,mall_name,platform,external_product_id')
    .eq('platform', 'cps').eq('external_product_id', sourceId).maybeSingle();
  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 503 });
  if (!product) return NextResponse.json({ item: null });
  const { data: price } = await db.from('price_history').select('price,collected_at').eq('product_id', product.id)
    .order('collected_at', { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ item: { ...product, price: price?.price ?? null, checkedAt: price?.collected_at ?? null } },
    { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = adminDb();
  if (!db) return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  const sourceId = String(input?.sourceId || ''), title = String(input?.title || '').trim();
  const merchant = String(input?.merchant || '').trim(), originalUrl = String(input?.originalUrl || '');
  const affiliateUrl = String(input?.affiliateUrl || ''), observedAt = String(input?.observedAt || '');
  const price = Number(input?.price);
  let original: URL, affiliate: URL;
  try { original = new URL(originalUrl); affiliate = new URL(affiliateUrl); }
  catch { return NextResponse.json({ error: 'invalid_url' }, { status: 400 }); }
  if (!/^lp_[a-z0-9_:-]{5,180}$/i.test(sourceId) || !title || title.length > 160 ||
      !merchant || merchant.length > 80 || !Number.isInteger(price) || price <= 0 || price > 100_000_000 ||
      original.protocol !== 'https:' || original.username || original.password ||
      original.hostname === 'click.linkprice.com' || affiliate.protocol !== 'https:' ||
      affiliate.hostname !== 'click.linkprice.com' || !affiliate.pathname.startsWith('/click.php') ||
      affiliate.searchParams.get('a') !== 'A100707159' || !Number.isFinite(Date.parse(observedAt)) ||
      Math.abs(Date.now() - Date.parse(observedAt)) > 12 * 3600_000 || input?.currency !== 'KRW')
    return NextResponse.json({ error: 'invalid_product' }, { status: 400 });
  const { data: product, error } = await db.from('products').upsert({ platform: 'cps', external_product_id: sourceId,
    title, mall_name: merchant, product_url: originalUrl, affiliate_url: affiliateUrl },
    { onConflict: 'platform,external_product_id' }).select('id').single();
  if (error || !product) return NextResponse.json({ error: 'product_write_failed' }, { status: 503 });
  const { data: last } = await db.from('price_history').select('price,collected_at').eq('product_id', product.id)
    .order('collected_at', { ascending: false }).limit(1).maybeSingle();
  if (!last || last.price !== price || Date.now() - Date.parse(last.collected_at) > 5 * 3600_000) {
    const { error: priceError } = await db.from('price_history').insert({ product_id: product.id, price, collected_at: observedAt });
    if (priceError) return NextResponse.json({ error: 'price_write_failed' }, { status: 503 });
  }
  return NextResponse.json({ sourceId, stored: true });
}
