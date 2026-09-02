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
        "unit_price": raw.unit_price,
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


def latest_prices(product_id: int, k: int) -> list[int]:
    """가장 최근 k개 가격(최신순). 종료 판정용 — 단일 blip에 안 흔들리게."""
    if config.DRY_RUN:
        return []
    rows = (
        client()
        .table("price_history")
        .select("price")
        .eq("product_id", product_id)
        .order("collected_at", desc=True)
        .limit(k)
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
    # updated_at을 매 플래그마다 갱신 → expire의 TTL(마지막으로 본 시각) 판정 근거.
    from datetime import datetime, timezone
    body = {
        "product_id": product_id,
        "status": "active",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **fields,
    }
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
        .select("id, product_id, baseline_price, updated_at")
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
    # collected_at은 카드 표시가 아니라 마지막 성공 수집 시각이다.
    # 이를 갱신해야 flight_fresh_within()이 중복 API 호출을 막는다.
    from datetime import datetime, timezone
    from statistics import median

    # 이 노선·날짜의 가격 이력을 쌓고 평소가(중앙값)를 계산 → "평소보다 하락" 판정용.
    #   flight_price_history 테이블이 아직 없으면(마이그레이션 전) 조용히 건너뛴다.
    baseline = None
    if item.price:
        try:
            client().table("flight_price_history").insert(
                {"external_id": item.external_id, "price": item.price}
            ).execute()
            hist = (
                client()
                .table("flight_price_history")
                .select("price")
                .eq("external_id", item.external_id)
                .order("collected_at", desc=True)
                .limit(300)
                .execute()
                .data
            )
            prices = [h["price"] for h in hist if h.get("price")]
            if prices:
                baseline = int(median(prices))
        except Exception as e:
            print(f"[flights] price_history 스킵(마이그레이션 전?): {e}")

    body = {
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
        "collected_at": datetime.now(timezone.utc).isoformat(),
    }
    if baseline is not None:
        body["baseline_price"] = baseline
    try:
        client().table("flight_deals").upsert(
            body, on_conflict="source,external_id"
        ).execute()
    except Exception:
        # baseline_price 컬럼이 아직 없으면 빼고 재시도(마이그레이션 전 호환).
        body.pop("baseline_price", None)
        client().table("flight_deals").upsert(
            body, on_conflict="source,external_id"
        ).execute()


def prune_old_flights() -> None:
    if config.DRY_RUN:
        return
    client().rpc("prune_old_flight_deals").execute()
    # 가격 이력은 90일치만 유지(테이블 없으면 스킵).
    try:
        from datetime import datetime, timedelta, timezone
        cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
        client().table("flight_price_history").delete().lt(
            "collected_at", cutoff
        ).execute()
    except Exception:
        pass


def flight_fresh_within(hours: float) -> bool:
    """가장 최근 항공권 수집이 hours 시간 내면 True (재수집 스킵용)."""
    if config.DRY_RUN:
        return False
    from datetime import datetime, timedelta, timezone
    rows = (
        client()
        .table("flight_deals")
        .select("collected_at")
        .order("collected_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        return False
    last = datetime.fromisoformat(rows[0]["collected_at"].replace("Z", "+00:00"))
    return datetime.now(timezone.utc) - last < timedelta(hours=hours)


# ── 경매 특가 ─────────────────────────────────────────────────
def upsert_auction_deal(item) -> None:
    if config.DRY_RUN:
        return
    payload = {
        "source": item.source,
        "external_id": item.external_id,
        "case_no": item.case_no,
        "asset_type": item.asset_type,
        "title": item.title,
        "location": item.location,
        "appraisal_price": item.appraisal_price,
        "min_bid_price": item.min_bid_price,
        "fail_count": item.fail_count,
        "bid_date": item.bid_end_date,       # 하위호환(종료일)
        "bid_start_date": item.bid_start_date,  # 입찰 시작일시
        "bid_end_date": item.bid_end_date,      # 입찰 종료(마감)일시
        "detail_url": item.detail_url,
        "posted_at": item.posted_at,
    }
    tbl = client().table("auction_deals")
    try:
        tbl.upsert(payload, on_conflict="source,external_id").execute()
    except Exception:
        # 마이그레이션(bid_start_date/bid_end_date 컬럼) 전이면 해당 컬럼 없이 재시도
        for k in ("bid_start_date", "bid_end_date"):
            payload.pop(k, None)
        tbl.upsert(payload, on_conflict="source,external_id").execute()


def prune_old_auction() -> None:
    if config.DRY_RUN:
        return
    client().rpc("prune_old_auction_deals").execute()
