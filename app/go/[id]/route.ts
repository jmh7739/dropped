import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { safeUrl } from "@/lib/format";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id) || !supabase) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { data } = await supabase
    .from("v_active_deals")
    .select("product_id, affiliate_url, product_url")
    .eq("product_id", id)
    .eq("status", "active")
    .order("detected_at", { ascending: false })
    .limit(1);

  let row = data?.[0] as
    | { product_id: number; affiliate_url: string | null; product_url: string | null }
    | undefined;

  // 활성 딜이 아닌 추적 상품(예: '요즘 뜨는 상품' 트렌딩)은 v_active_deals에 없다.
  //   → products에서 제휴링크를 직접 찾아 수익 링크로 보낸다(홈으로 튕기지 않게).
  if (!row) {
    const { data: p } = await supabase
      .from("products")
      .select("id, affiliate_url, product_url")
      .eq("id", id)
      .limit(1);
    const pr = p?.[0];
    if (pr) {
      row = {
        product_id: pr.id,
        affiliate_url: pr.affiliate_url,
        product_url: pr.product_url,
      };
    }
  }

  const url = safeUrl(row?.affiliate_url ?? row?.product_url);
  if (!row || url === "#") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // PostgREST builders are lazy: await executes the RPC before the serverless response ends.
  //   클릭 집계는 실패해도 수익 리다이렉트를 막지 않게 방어.
  try {
    await supabase.rpc("click_deal", { p_product_id: row.product_id });
  } catch {
    /* 집계 실패 무시 — 리다이렉트 우선 */
  }

  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
