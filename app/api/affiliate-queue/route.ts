import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.DROPPED_WORKER_TOKEN;
  const received = request.headers.get("x-dropped-worker-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && received && expected === received);
}

function adminDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = adminDb();
  if (!db) return NextResponse.json({ error: "server_not_configured" }, { status: 503 });
  const { data, error } = await db.from("affiliate_queue").select("id,type,keyword,normalized_keyword,external_product_id,original_url,status").eq("status", "pending").order("created_at").limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data || []).map(row => ({ id: row.id, type: row.type, keyword: row.keyword, normalizedKeyword: row.normalized_keyword, productId: row.external_product_id, originalUrl: row.original_url, status: row.status })));
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = adminDb();
  if (!db) return NextResponse.json({ error: "server_not_configured" }, { status: 503 });
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  const status = body?.status === "success" ? "success" : "error";
  const affiliateUrl = String(body?.affiliateUrl || "");
  if (!Number.isFinite(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  if (status === "success" && !/^https:\/\/link\.coupang\.com\//i.test(affiliateUrl)) return NextResponse.json({ error: "invalid_affiliate_url" }, { status: 400 });
  const { data: item, error: readError } = await db.from("affiliate_queue").select("*").eq("id", id).single();
  if (readError || !item) return NextResponse.json({ error: "queue_item_not_found" }, { status: 404 });
  const { error: updateError } = await db.from("affiliate_queue").update({ status, affiliate_url: status === "success" ? affiliateUrl : null, error: status === "error" ? String(body?.error || "링크 생성 실패").slice(0, 1000) : null, attempts: (item.attempts || 0) + 1, updated_at: new Date().toISOString() }).eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (status === "success" && item.type === "keywordSearch") {
    await db.from("affiliate_keyword_cache").upsert({ normalized_keyword: item.normalized_keyword, keyword: item.keyword, affiliate_url: affiliateUrl, updated_at: new Date().toISOString() }, { onConflict: "normalized_keyword" });
    await db.from("realtime_trends").update({ affiliate_search_url: affiliateUrl }).eq("normalized_keyword", item.normalized_keyword);
    const { data: unpublished } = await db.from("realtime_trends").select("collected_at").eq("is_published", false);
    const snapshots = [...new Set((unpublished || []).map(row => row.collected_at))];
    for (const collectedAt of snapshots) {
      const { count: total } = await db.from("realtime_trends").select("id", { count: "exact", head: true }).eq("collected_at", collectedAt);
      const { count: missing } = await db.from("realtime_trends").select("id", { count: "exact", head: true }).eq("collected_at", collectedAt).is("affiliate_search_url", null);
      if (total === 20 && missing === 0) await db.from("realtime_trends").update({ is_published: true }).eq("collected_at", collectedAt);
    }
  }
  if (status === "success" && item.type === "product") {
    if (item.product_id) await db.from("products").update({ affiliate_url: affiliateUrl }).eq("id", item.product_id);
    else if (item.external_product_id) await db.from("products").update({ affiliate_url: affiliateUrl }).eq("platform", "coupang").eq("external_product_id", item.external_product_id);
    if (item.product_id) {
      await db.from("trending_products").update({ is_active: true, updated_at: new Date().toISOString() }).eq("product_id", item.product_id);
      const { data: active } = await db.from("trending_products").select("product_id").eq("is_active", true).order("hot_score", { ascending: false }).order("product_score", { ascending: false });
      const overflow = (active || []).slice(30).map(row => row.product_id);
      if (overflow.length) await db.from("trending_products").update({ is_active: false }).in("product_id", overflow);
    }
  }
  return NextResponse.json({ ok: true });
}
