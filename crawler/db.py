"""Supabase 읽기/쓰기 래퍼. DRY_RUN이면 메모리 딕셔너리로 시뮬레이션."""
from __future__ import annotations
from typing import Optional

import config

_client = None


def client():
    global _client
    if _client is None:
        from supabase import create_client
        _client = create_client(
            config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY
        )
    return _client


# ── 카테고리 slug → id 캐시 ───────────────────────────────────
_category_cache: dict[str, int] = {}


def category_id(slug: str) -> Optional[int]:
    if config.DRY_RUN:
        return None
    if not _category_cache:
        rows = client().table("categories").select("id, slug").execute().data
        for r in rows:
            _category_cache[r["slug"]] = r["id"]
    return _category_cache.get(slug)


def upsert_product(raw) -> Optional[int]:
    """products upsert 후 product_id 반환 (DRY_RUN이면 external_id 해시)."""
    if config.DRY_RUN:
        return abs(hash((raw.platform, raw.external_product_id))) % 1_000_000
    payload = {
        "platform": raw.platform,
        "external_product_id": raw.external_product_id,
        "title": raw.title,
        "category_id": category_id(raw.category_slug),
        "image_url": raw.image_url,
        "product_url": raw.product_url,
        "affiliate_url": raw.affiliate_url,
        "list_price": raw.list_price,
        "mall_name": raw.mall_name,
        "shipping_fee": raw.shipping_fee,
    }
    res = (
        client()
        .table("products")
        .upsert(payload, on_conflict="platform,external_product_id")
        .execute()
    )
    return res.data[0]["id"] if res.data else None


def recent_prices(product_id: int) -> list[int]:
    """최근 BASELINE_WINDOW_DAYS 내 가격 이력."""
    if config.DRY_RUN:
        return []
    from datetime import datetime, timedelta, timezone
    since = (
        datetime.now(timezone.utc)
        - timedelta(days=config.BASELINE_WINDOW_DAYS)
    ).isoformat()
    rows = (
        client()
        .table("price_history")
        .select("price")
        .eq("product_id", product_id)
        .gte("collected_at", since)
        .execute()
        .data
    )
    return [r["price"] for r in rows]


def history_days(product_id: int) -> float:
    """가격 이력이 걸쳐있는 기간(일). 이력 없으면 0."""
    if config.DRY_RUN:
        return 0.0
    rows = (
        client()
        .table("price_history")
        .select("collected_at")
        .eq("product_id", product_id)
        .order("collected_at")
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        return 0.0
    from datetime import datetime, timezone
    oldest = datetime.fromisoformat(rows[0]["collected_at"].replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - oldest).total_seconds() / 86400


def insert_price(product_id: int, price: int) -> None:
    if config.DRY_RUN:
        return
    client().table("price_history").insert(
        {"product_id": product_id, "price": price}
    ).execute()


def upsert_active_deal(product_id: int, fields: dict) -> None:
    """진행중 딜 upsert. 상품당 active 1개(부분 유니크 인덱스) 전제."""
    if config.DRY_RUN:
        return
    # 기존 active 딜이 있으면 갱신, 없으면 삽입
    existing = (
        client()
        .table("hot_deals")
        .select("id")
        .eq("product_id", product_id)
        .eq("status", "active")
        .execute()
        .data
    )
    body = {"product_id": product_id, "status": "active", **fields}
    if existing:
        client().table("hot_deals").update(body).eq(
            "id", existing[0]["id"]
        ).execute()
    else:
        client().table("hot_deals").insert(body).execute()


def active_deals() -> list[dict]:
    """현재 진행중인 모든 딜 (종료 재검사용)."""
    if config.DRY_RUN:
        return []
    return (
        client()
        .table("hot_deals")
        .select("id, product_id, baseline_price")
        .eq("status", "active")
        .execute()
        .data
    )


def end_deal(deal_id: int) -> None:
    if config.DRY_RUN:
        return
    from datetime import datetime, timezone
    client().table("hot_deals").update(
        {"status": "ended", "ended_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", deal_id).execute()


def prune_ended_deals() -> None:
    """24시간 지난 종료 딜 제거."""
    if config.DRY_RUN:
        return
    client().rpc("prune_ended_deals").execute()


def rollup_old_history() -> None:
    if config.DRY_RUN:
        return
    client().rpc("rollup_old_price_history").execute()


# ── 항공권 특가 ───────────────────────────────────────────────
def upsert_flight_deal(item) -> None:
    if config.DRY_RUN:
        return
    client().table("flight_deals").upsert(
        {
            "source": item.source,
            "external_id": item.external_id,
            "origin": item.origin,
            "destination": item.destination,
            "depart_date": item.depart_date,
            "return_date": item.return_date,
            "airline": item.airline,
            "price": item.price,
            "is_domestic": item.is_domestic,
            "deal_url": item.deal_url,
            "posted_at": item.posted_at,
        },
        on_conflict="source,external_id",
    ).execute()


def prune_old_flights() -> None:
    if config.DRY_RUN:
        return
    client().rpc("prune_old_flight_deals").execute()


# ── 경매 특가 ─────────────────────────────────────────────────
def upsert_auction_deal(item) -> None:
    if config.DRY_RUN:
        return
    client().table("auction_deals").upsert(
        {
            "source": item.source,
            "external_id": item.external_id,
            "case_no": item.case_no,
            "asset_type": item.asset_type,
            "title": item.title,
            "location": item.location,
            "appraisal_price": item.appraisal_price,
            "min_bid_price": item.min_bid_price,
            "fail_count": item.fail_count,
            "bid_date": item.bid_date,
            "detail_url": item.detail_url,
            "posted_at": item.posted_at,
        },
        on_conflict="source,external_id",
    ).execute()


def prune_old_auction() -> None:
    if config.DRY_RUN:
        return
    client().rpc("prune_old_auction_deals").execute()
