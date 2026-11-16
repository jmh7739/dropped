import os
import tempfile
import time
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

import db
import run
from price_state import PriceState


def iso(seconds_ago: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(seconds=seconds_ago)).isoformat()


class FakeQuery:
    def __init__(self, client, table):
        self.client, self.table, self.ops = client, table, []

    def __getattr__(self, name):
        def op(*args, **kwargs):
            self.ops.append((name, args, kwargs))
            return self
        return op

    def execute(self):
        self.client.calls.append((self.table, self.ops))
        return SimpleNamespace(data=self.client.handler(self.table, self.ops))


class FakeClient:
    def __init__(self, handler):
        self.handler, self.calls = handler, []

    def table(self, name):
        return FakeQuery(self, name)


def op_names(ops):
    return [name for name, _, _ in ops]


class PriceStateTests(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.path = os.path.join(self.dir, "state.json.gz")
        db._state = None
        db._blocked = None

    def tearDown(self):
        db._state = None
        db._blocked = None

    def run_items(self, handler, items):
        fake = FakeClient(handler)
        with patch.object(db.config, "DRY_RUN", False), patch.object(db, "client", lambda: fake):
            db.start_price_state(self.path)
            for pid, price in items:
                db.recent_prices(pid)
                db.history_days(pid)
                db.insert_price(pid, price)
            db.save_price_state()
        return fake

    def test_warm_run_reads_only_new_rows_instead_of_each_product_history(self):
        def handler(table, ops):
            names = op_names(ops)
            if table == "price_history" and "insert" in names:
                return [{"collected_at": iso(0)}]
            if table == "price_history" and "range" in names:
                return [{"product_id": 1, "price": 900, "collected_at": iso(1800)}]
            if table == "price_history":
                pid = next(args[1] for name, args, _ in ops if name == "eq")
                return [{"price": 1000, "collected_at": iso(5 * 86400)}] if pid == 1 else []
            return []

        cold = self.run_items(handler, [(1, 950), (2, 2000)])
        cold_reads = [c for c in cold.calls if c[0] == "price_history" and "insert" not in op_names(c[1])]
        self.assertEqual(len(cold_reads), 4, "first run: 90-day history and first observation per product")

        warm = self.run_items(handler, [(1, 950), (2, 2000)])
        warm_reads = [c for c in warm.calls if c[0] == "price_history" and "insert" not in op_names(c[1])]
        self.assertEqual(len(warm_reads), 1, "next run: one read of rows since the previous run")
        self.assertIn("gte", op_names(warm_reads[0][1]))
        inserts = [c for c in warm.calls if "insert" in op_names(c[1])]
        self.assertEqual(inserts, [], "same price on the same Korean day is not stored again")

        state = PriceState(self.path)
        self.assertTrue(state.load(int(time.time())))
        self.assertEqual(sorted(state.recent_prices(1, 0)), [900, 950, 1000])
        self.assertAlmostEqual((time.time() - state.first(1)) / 86400, 5, delta=0.01)

    def test_new_rows_ask_only_for_the_database_time(self):
        def handler(table, ops):
            if "insert" in op_names(ops):
                self.assertIn(("select", ("collected_at",), {}), ops)
                return [{"collected_at": iso(0)}]
            return []
        self.run_items(handler, [(5, 1234)])

    def test_old_or_broken_state_starts_cold(self):
        state = PriceState(self.path)
        state.synced_at = int(time.time()) - 10 * 86400
        state.products = {1: {"first": 1, "obs": [[1, 1]], "seen": int(time.time())}}
        state.save(int(time.time()))
        self.assertFalse(PriceState(self.path).load(int(time.time())))
        with open(self.path, "wb") as f:
            f.write(b"broken")
        self.assertFalse(PriceState(self.path).load(int(time.time())))


class BatchedCollectionTests(unittest.TestCase):
    def setUp(self):
        self.path = os.path.join(tempfile.mkdtemp(), "state.json.gz")
        db._state = None
        db._blocked = None

    def tearDown(self):
        db._state = None
        db._blocked = None
        db._pending_prices = None

    def test_a_source_is_saved_with_a_handful_of_requests(self):
        def handler(table, ops):
            names = op_names(ops)
            if table == "products" and "upsert" in names:
                payload = next(args[0] for name, args, _ in ops if name == "upsert")
                return [{"id": 100 + int(p["external_product_id"]), "platform": p["platform"],
                         "external_product_id": p["external_product_id"]} for p in payload]
            if table == "price_history" and "insert" in names:
                rows = next(args[0] for name, args, _ in ops if name == "insert")
                return [{**r, "collected_at": iso(0)} for r in rows]
            if table == "categories":
                return [{"id": 1, "slug": "food"}]
            return []

        raws = [SimpleNamespace(platform="cps", external_product_id=str(i), title=f"상품 {i}", current_price=1000 + i,
                                list_price=None, image_url="", product_url="", affiliate_url="", category_slug="food",
                                mall_name=None, shipping_fee=None, unit_price=None, curated=False) for i in range(250)]
        fake = FakeClient(handler)
        sources = [SimpleNamespace(__name__="sources.cps", fetch=lambda: raws)]
        with patch.object(db.config, "DRY_RUN", False), patch.object(db, "client", lambda: fake), \
             patch.object(run, "SOURCES", sources), \
             patch.object(run.price_quality, "validate_price", return_value=("ok", [])):
            db._category_cache.clear()
            db.start_price_state(self.path)
            _, scanned, _, _, errors, _ = run.collect_and_flag()
        self.assertEqual(scanned, 250)
        self.assertEqual(errors, [])
        tables = [t for t, _ in fake.calls]
        # categories 1 + products upsert 1 + history preload 3 (100 ids each) + price insert 1
        self.assertLessEqual(len(fake.calls), 6, tables)
        self.assertEqual(len(db._state.products), 250)


class QuotaBlockTests(unittest.TestCase):
    def tearDown(self):
        db._blocked = None
        db._state = None

    def test_quota_error_stops_all_further_requests(self):
        error = Exception({"message": "JSON could not be generated", "code": 402})
        db.note_error(error)
        self.assertTrue(db.blocked())
        with self.assertRaises(db.DatabaseBlocked):
            db.client()

    def test_collection_stops_at_the_first_quota_refusal(self):
        calls = []

        def upsert(raws):
            calls.append(len(raws))
            raise Exception("{'code': 402, 'message': 'exceed_egress_quota'}")

        raws = [SimpleNamespace(platform="cps", external_product_id=str(i), title="상품", current_price=1000,
                                list_price=None, image_url="", product_url="", affiliate_url="", category_slug="food",
                                mall_name=None, shipping_fee=None, unit_price=None, curated=False) for i in range(5)]
        with patch.object(run, "SOURCES", [SimpleNamespace(__name__="sources.cps", fetch=lambda: raws)]), \
             patch.object(run.price_quality, "validate_price", return_value=("ok", [])), \
             patch.object(run.db, "upsert_products", upsert):
            _, _, _, _, errors, _ = run.collect_and_flag()
        self.assertEqual(calls, [5], "one batched request, nothing after the refusal")
        self.assertIn("database_blocked", errors)


if __name__ == "__main__":
    unittest.main()
