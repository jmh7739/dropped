"""수집 오케스트레이터 — GitHub Actions cron이 주기적으로 실행.

흐름:
1) 각 소스에서 특가 피드 수집
2) 상품 upsert + 가격 이력 적재
3) 이상탐지/가드레일로 딜 판정 → 진행중 딜 갱신
4) 기존 진행중 딜 재검사 → 원복/이탈 시 종료 처리
5) 오래된 이력 롤업
"""
from __future__ import annotations

import sys

# Windows 콘솔(cp949)에서도 UTF-8 로그가 깨지지 않도록
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import config
import db
import detect
# 네이버 검색 API는 신규 앱에 권한 부여가 막혀(정책) 제외. sources/naver.py는
# 남겨둠 — 향후 접근 가능해지면 아래 SOURCES에 다시 넣으면 됨.
from sources import coupang, aliexpress, cps, flights, auction

SOURCES = [coupang, aliexpress, cps]


def collect_and_flag() -> tuple[int, int]:
    seen_product_ids: set[int] = set()
    flagged = 0
    scanned = 0

    for src in SOURCES:
        for raw in src.fetch():
            scanned += 1
            product_id = db.upsert_product(raw)
            if product_id is None:
                continue
            seen_product_ids.add(product_id)

            history = db.recent_prices(product_id)
            hdays = db.history_days(product_id)
            db.insert_price(product_id, raw.current_price)

            verdict = detect.classify(
                current_price=raw.current_price,
                list_price=raw.list_price,
                history_prices=history,
                history_days=hdays,
            )

            tag = "[DEAL]" if verdict.is_deal else "[skip]"
            err = " (price-error?)" if verdict.is_price_error else ""
            print(f"{tag}{err} | {raw.platform} | {raw.title[:30]} "
                  f"| {raw.current_price:,}원 | {verdict.reason}")

            if not verdict.is_deal:
                continue

            db.upsert_active_deal(product_id, {
                "current_price": raw.current_price,
                "list_price": raw.list_price,
                "baseline_price": verdict.baseline_price,
                "discount_vs_list": verdict.discount_vs_list,
                "discount_vs_avg": verdict.discount_vs_avg,
                "is_lowest_ever": verdict.is_lowest_ever,
                "is_price_error": verdict.is_price_error,
            })
            flagged += 1

    return flagged, scanned


def expire_stale_deals() -> int:
    """진행중 딜 중 이번 수집에서 이탈했거나 가격 원복된 것 종료."""
    ended = 0
    for d in db.active_deals():
        prices = db.recent_prices(d["product_id"])
        current = prices[-1] if prices else None
        if current is None:
            continue
        if detect.should_end_deal(current, d.get("baseline_price")):
            db.end_deal(d["id"])
            ended += 1
    return ended


def main() -> None:
    mode = "DRY_RUN(DB 미기록)" if config.DRY_RUN else "LIVE"
    print(f"=== 핫딜 수집 시작 [{mode}] ===")

    flagged, scanned = collect_and_flag()
    print(f"\n스캔 {scanned}건 → 딜 {flagged}건 플래그")

    ended = expire_stale_deals()
    if ended:
        print(f"종료 처리된 딜: {ended}건")

    db.prune_ended_deals()   # 24h 지난 종료 딜 제거
    db.rollup_old_history()

    print("\n--- 항공권 특가 ---")
    fn = collect_flights()
    print(f"항공권 {fn}건 수집")

    print("\n--- 경매 특가 ---")
    an = collect_auction()
    print(f"경매 {an}건 수집")

    print("=== 완료 ===")


def collect_flights() -> int:
    items = flights.fetch()
    for it in items:
        db.upsert_flight_deal(it)
        rt = f"~{it.return_date}" if it.return_date else " 편도"
        print(f"[flights] {it.origin}->{it.destination} "
              f"({it.depart_date}{rt}) {it.price:,}원")
    db.prune_old_flights()
    return len(items)


def collect_auction() -> int:
    items = auction.fetch()
    for it in items:
        db.upsert_auction_deal(it)
        drop = ""
        if it.appraisal_price and it.min_bid_price:
            drop = f" (감정가대비 -{round((1-it.min_bid_price/it.appraisal_price)*100)}%)"
        print(f"[auction] [{it.asset_type}] {it.title[:28]} "
              f"최저 {it.min_bid_price:,}원{drop}")
    db.prune_old_auction()
    return len(items)


if __name__ == "__main__":
    main()
