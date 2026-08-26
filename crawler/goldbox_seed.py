"""골드박스 수동 갱신 스크립트.

사용자가 준 쿠팡 골드박스 링크로 goldbox_deals 테이블을 통째 교체한다.
(매일 새 링크 받으면 아래 GOLDBOX를 채우고 실행 → 이전 것 싹 지우고 새로 등록)

실행: cd crawler && python goldbox_seed.py
"""
from __future__ import annotations
import config
import db

# 매일 갱신: (상품명, 정가, 할인가, 제휴링크, 카테고리, 단위가격, 배송비, 라벨)
#   정가/단위가격/배송비/라벨 없으면 None (배송비 0=무료, 라벨 없으면 '골드박스'로 표시)
GOLDBOX = [
    # ("행복미트 찜갈비 1kg 2개", 60000, 21880,
    #  "https://link.coupang.com/a/xxxx", "식품/건강", "100g당 1,094원", 0, "골드박스"),
]


def main() -> None:
    if config.DRY_RUN:
        print("Supabase 미연결 — 중단")
        return
    c = db.client()
    # 1) 기존 골드박스 전체 삭제 (매일 통째 교체)
    c.table("goldbox_deals").delete().neq("id", 0).execute()
    # 2) 새로 등록
    rows = []
    for i, item in enumerate(GOLDBOX):
        title, lst, cur, url, cat, unit, ship = item[:7]
        label = item[7] if len(item) > 7 else None
        rate = round((lst - cur) / lst * 100) if lst and lst > 0 else None
        rows.append({
            "title": title, "affiliate_url": url,
            "list_price": lst, "current_price": cur, "discount_rate": rate,
            "category": cat, "unit_price": unit, "shipping_fee": ship,
            "label": label, "sort_order": i,
        })
    if rows:
        c.table("goldbox_deals").insert(rows).execute()
    print(f"골드박스 {len(rows)}건 교체 완료")


if __name__ == "__main__":
    main()
