import unittest
from dataclasses import replace
from unittest.mock import Mock, patch

import db
import price_quality as q
import run
from sources.base import RawDeal


def sample(**values):
    raw = RawDeal("cps", "item-1", "Example", "", "https://shop.test/item?token=secret", "",
                  10000, 20000, "living")
    return replace(raw, **values)


class PriceQualityTests(unittest.TestCase):
    def test_unknown_conditions_are_not_public_price_or_free_shipping(self):
        quality, reasons = q.validate_price(sample())
        self.assertEqual(quality, "warning")
        self.assertIn("conditions_unconfirmed", reasons)
        self.assertIn("shipping_unconfirmed", reasons)

    def test_invalid_and_conditional_prices_never_become_bargains(self):
        for kwargs in [dict(current_price=0), dict(current_price=-1), dict(current_price=True),
                       dict(current_price="10000"), dict(currency="USD"), dict(price_basis="card"),
                       dict(price_basis="coupon"), dict(price_basis="option_min"),
                       dict(stock_status="out_of_stock"), dict(quantity=0), dict(shipping_fee=-1)]:
            self.assertEqual(q.validate_price(sample(**kwargs))[0], "quarantined", kwargs)

    def test_reference_price_inversion_does_not_discard_valid_selling_price(self):
        quality, reasons = q.validate_price(sample(list_price=9000))
        self.assertEqual(quality, "warning")
        self.assertIn("invalid_reference_price", reasons)

    def test_large_drop_is_quarantined_without_poisoning_baseline(self):
        self.assertEqual(q.validate_price(sample(current_price=1000), [20000]*4)[0], "quarantined")
        self.assertNotEqual(q.validate_price(sample(current_price=15000), [20000]*4)[0], "quarantined")

    @patch("db.config.DRY_RUN", False)
    @patch("db.client")
    def test_rollup_does_not_call_the_deleting_database_function(self, client):
        db.rollup_old_history()
        client.assert_not_called()

    @patch("db.config.DRY_RUN", False)
    @patch("db.client")
    def test_flight_cleanup_does_not_delete_history(self, client):
        db.prune_old_flights()
        client.return_value.table.assert_not_called()

    @patch("run.db")
    def test_quarantined_curated_item_cannot_bypass_price_validation(self, database):
        source = Mock(__name__="sources.popular")
        source.fetch.return_value = [sample(current_price=0, curated=True)]
        database.upsert_product.return_value = 1
        database.recent_prices.return_value = []
        database.history_days.return_value = 0
        with patch("run.SOURCES", [source]):
            run.collect_and_flag()
        database.upsert_active_deal.assert_not_called()
        database.insert_price.assert_not_called()
        database.upsert_product.assert_not_called()

    @patch("run.db")
    def test_same_product_twice_in_source_is_one_observation(self, database):
        source = Mock(__name__="sources.popular")
        source.fetch.return_value = [sample(), sample()]
        database.upsert_product.return_value = 1
        database.recent_prices.return_value = []
        database.history_days.return_value = 0
        with patch("run.SOURCES", [source]):
            run.collect_and_flag()
        self.assertEqual(database.insert_price.call_count, 1)


if __name__ == "__main__":
    unittest.main()
