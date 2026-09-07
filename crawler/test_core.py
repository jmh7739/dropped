import unittest
from unittest.mock import patch

import db
import run


class TitleNormalizationTests(unittest.TestCase):
    def test_normalizes_entities_whitespace_and_controls(self):
        value = "  가방&amp;지갑\n\t특가\x00  "
        self.assertEqual(db.normalize_title(value), "가방&지갑 특가")

    def test_limits_untrusted_feed_title_length(self):
        self.assertEqual(len(db.normalize_title("가" * 300)), 180)


class ExpirationSafetyTests(unittest.TestCase):
    @patch("run.db.end_deal")
    @patch("run.db.active_deals")
    def test_does_not_expire_curated_deals_when_a_source_failed(
        self, active_deals, end_deal
    ):
        active_deals.return_value = [{
            "id": 10,
            "product_id": 20,
            "baseline_price": None,
            "updated_at": "2020-01-01T00:00:00+00:00",
        }]

        ended = run.expire_stale_deals(
            flagged_ids=set(),
            curated_ids={999},
            allow_curated_expire=False,
        )

        self.assertEqual(ended, 0)
        end_deal.assert_not_called()


if __name__ == "__main__":
    unittest.main()

