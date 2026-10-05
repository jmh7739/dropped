"""Convert verified Coupang product queue items with the official deep-link API.

Search keyword links stay in the review queue: the product deep-link endpoint
does not establish that a search URL can be converted safely.
"""
from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlparse

import config
import db
from sources import coupang


def eligible_product_url(raw: object) -> bool:
    if not isinstance(raw, str):
        return False
    parsed = urlparse(raw)
    return parsed.scheme == "https" and parsed.hostname == "www.coupang.com" and parsed.path.startswith("/vp/products/")


def process_pending(limit: int = 100) -> int:
    if config.DRY_RUN or not config.COUPANG_ACCESS_KEY or not config.COUPANG_SECRET_KEY:
        return 0
    client = db.client()
    rows = (client.table("affiliate_queue")
        .select("id,type,product_id,external_product_id,original_url,attempts")
        .eq("status", "pending").eq("type", "product")
        .order("created_at").limit(limit).execute().data or [])
    eligible = [row for row in rows if eligible_product_url(row.get("original_url"))]
    if not eligible:
        return 0
    links = coupang._to_affiliate_batch(list(dict.fromkeys(row["original_url"] for row in eligible)))
    completed = 0
    for row in eligible:
        affiliate_url = links.get(row["original_url"], "")
        if not affiliate_url.startswith("https://link.coupang.com/"):
            continue
        product_id = row.get("product_id")
        external_id = row.get("external_product_id")
        if product_id:
            client.table("products").update({"affiliate_url": affiliate_url}).eq("id", product_id).execute()
            client.table("trending_products").update({"is_active": True}).eq("product_id", product_id).execute()
        elif external_id:
            client.table("products").update({"affiliate_url": affiliate_url}).eq("platform", "coupang").eq("external_product_id", external_id).execute()
        else:
            continue
        client.table("affiliate_queue").update({
            "status": "success", "affiliate_url": affiliate_url, "error": None,
            "attempts": int(row.get("attempts") or 0) + 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", row["id"]).eq("status", "pending").execute()
        completed += 1
    if completed:
        active = (client.table("trending_products").select("product_id")
            .eq("is_active", True).order("hot_score", desc=True)
            .order("product_score", desc=True).execute().data or [])
        overflow = [row["product_id"] for row in active[30:]]
        if overflow:
            client.table("trending_products").update({"is_active": False}).in_("product_id", overflow).execute()
    print(f"[affiliate_queue] product queue {len(eligible)} checked, {completed} converted")
    if eligible and not links:
        raise RuntimeError("쿠팡 공식 딥링크 API가 상품 제휴주소를 반환하지 않았습니다")
    return completed
