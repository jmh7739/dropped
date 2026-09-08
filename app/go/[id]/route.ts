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

  const row = data?.[0];
  const url = safeUrl(row?.affiliate_url ?? row?.product_url);
  if (!row || url === "#") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  void supabase.rpc("click_deal", { p_product_id: row.product_id });

  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
