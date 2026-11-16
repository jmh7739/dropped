"""수집기 실행 사이에 유지하는 상품별 가격 기억(GitHub Actions cache에 저장).

매 실행마다 상품마다 90일 가격 이력을 DB에서 다시 내려받던 것을 없앤다.
- 시작할 때 지난 실행 이후 새로 쌓인 price_history 행만 한 번에 읽어 합친다.
- 기억에 없는 상품(신규)만 그 상품의 90일 이력과 첫 관측일을 한 번 읽는다.
- 이번 실행이 넣은 가격은 DB가 돌려준 collected_at 그대로 기억에 추가한다.
파일이 없거나 오래됐거나 깨졌으면 비어 있는 상태로 시작한다(결과는 같고 읽기만 늘어남).
"""
from __future__ import annotations

import gzip
import json
import os
import tempfile
from datetime import datetime, timezone
from typing import Optional

VERSION = 1
WINDOW_SECONDS = 90 * 86400          # config.BASELINE_WINDOW_DAYS와 같은 기간
MAX_STATE_AGE_SECONDS = 3 * 86400    # 이보다 오래된 기억은 버리고 새로 읽는다
FORGET_UNSEEN_SECONDS = 30 * 86400   # 30일 동안 수집되지 않은 상품은 기억에서 뺀다
DELTA_OVERLAP_SECONDS = 15 * 60


def epoch(value) -> Optional[int]:
    try:
        return int(datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp())
    except (TypeError, ValueError):
        return None


class PriceState:
    def __init__(self, path: str):
        self.path = path
        self.synced_at: Optional[int] = None
        # product_id -> {"first": epoch|None, "obs": [[epoch, price], ...], "seen": epoch}
        self.products: dict[int, dict] = {}

    # ── 파일 ──────────────────────────────────────────────
    def load(self, now: int) -> bool:
        """사용할 수 있는 기억을 읽었으면 True."""
        try:
            with gzip.open(self.path, "rt", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError, EOFError):
            return False
        synced = data.get("synced_at") if isinstance(data, dict) else None
        if data.get("version") != VERSION or not isinstance(synced, int) or now - synced > MAX_STATE_AGE_SECONDS:
            return False
        self.synced_at = synced
        self.products = {
            int(pid): {"first": p.get("first"), "obs": [list(o) for o in p.get("obs", [])], "seen": p.get("seen", synced)}
            for pid, p in data.get("products", {}).items()
        }
        return True

    def save(self, now: int) -> None:
        self.prune(now)
        os.makedirs(os.path.dirname(os.path.abspath(self.path)), exist_ok=True)
        body = {"version": VERSION, "synced_at": self.synced_at, "products": {str(k): v for k, v in self.products.items()}}
        fd, tmp = tempfile.mkstemp(dir=os.path.dirname(os.path.abspath(self.path)), suffix=".tmp")
        os.close(fd)
        with gzip.open(tmp, "wt", encoding="utf-8") as f:
            json.dump(body, f, separators=(",", ":"))
        os.replace(tmp, self.path)

    def delta_since(self) -> Optional[str]:
        if self.synced_at is None:
            return None
        return datetime.fromtimestamp(self.synced_at - DELTA_OVERLAP_SECONDS, timezone.utc).isoformat()

    # ── 기억 갱신 ─────────────────────────────────────────
    def merge_rows(self, rows: list[dict]) -> None:
        """다른 실행·다른 수집기가 넣은 행을 합친다(기억에 있는 상품만)."""
        for r in rows:
            pid = r.get("product_id")
            p = self.products.get(pid)
            t = epoch(r.get("collected_at"))
            price = r.get("price")
            if p is None or t is None or not isinstance(price, int) or price <= 0:
                continue
            self._add(p, t, price)

    def put(self, pid: int, first: Optional[int], rows: list[dict], now: int) -> None:
        obs = sorted({(t, r["price"]) for r in rows if (t := epoch(r.get("collected_at"))) is not None and isinstance(r.get("price"), int) and r["price"] > 0})
        self.products[pid] = {"first": first, "obs": [list(o) for o in obs], "seen": now}

    def record(self, pid: int, collected_at, price: int, now: int) -> None:
        p = self.products.setdefault(pid, {"first": None, "obs": [], "seen": now})
        t = epoch(collected_at) or now
        self._add(p, t, price)
        p["seen"] = now

    def touch(self, pid: int, now: int) -> None:
        if pid in self.products:
            self.products[pid]["seen"] = now

    @staticmethod
    def _add(p: dict, t: int, price: int) -> None:
        if [t, price] in p["obs"]:
            return
        p["obs"].append([t, price])
        p["obs"].sort()
        if p["first"] is None or t < p["first"]:
            p["first"] = t

    def prune(self, now: int) -> None:
        keep_from = now - WINDOW_SECONDS
        for pid in list(self.products):
            p = self.products[pid]
            if now - p.get("seen", 0) > FORGET_UNSEEN_SECONDS:
                del self.products[pid]
                continue
            recent = [o for o in p["obs"] if o[0] >= keep_from]
            # 최신 관측 하나는 기간 밖이어도 남긴다(같은 날 중복 저장 판정용).
            if not recent and p["obs"]:
                recent = [p["obs"][-1]]
            p["obs"] = recent

    # ── 읽기 ──────────────────────────────────────────────
    def has(self, pid: int) -> bool:
        return pid in self.products

    def recent_prices(self, pid: int, since: int) -> list[int]:
        return [price for t, price in self.products[pid]["obs"] if t >= since]

    def latest_prices(self, pid: int, k: int) -> list[int]:
        return [price for _, price in reversed(self.products[pid]["obs"][-k:])]

    def last(self, pid: int) -> Optional[tuple[int, int]]:
        obs = self.products[pid]["obs"]
        return (obs[-1][0], obs[-1][1]) if obs else None

    def first(self, pid: int) -> Optional[int]:
        return self.products[pid]["first"]
