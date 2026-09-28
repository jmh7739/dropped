import unittest
from unittest.mock import patch

import db
import run
from classifier import brand_from, classify_slug, display_title


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


class ProductClassifierTests(unittest.TestCase):
    def check_slug(self, title: str, expected: str, source: str = "living"):
        self.assertEqual(classify_slug(title, source), expected, title)

    def test_user_reported_misclassified_items(self):
        cases = [
            ("P-6000 CD6404-002 : 롯데ON", "fashion"),
            ("NEW패턴 TRY 스탠다드 코튼 박서 5매 세트 : 롯데ON", "fashion"),
            ("미주라 통밀크래커 385gx2개+토스트 비스켓 320gx2개", "food"),
            ("하이면 2종 가쓰오우동 / 완도김우동 x 10봉", "food"),
            ("나랑드사이다 제로 345ml 뚱캔 1박스", "food"),
            ("빙그레 붕어싸만코/빵또아/시모나 20개", "food"),
            ("롯데 구구 크러스터 660ml x 6개", "food"),
            ("바닐라 아이스크림 4개입", "food"),
            ("베이컨 크림 파스타 2인분", "food"),
            ("토마토 스파게티 면 500g", "food"),
            ("동원 라이트 스탠다드 참치 150g 원터치 12개", "food"),
            ("오리온 포카칩 오리지널 66g 5개", "food"),
        ]
        for title, expected in cases:
            with self.subTest(title=title):
                self.check_slug(title, expected)

    def test_major_product_groups(self):
        cases = [
            ("나이키 남성 러닝화", "fashion"),
            ("BLACKYAK 남녀 고어텍스 다운자켓 1BYPAW3008", "fashion"),
            ("TRY 코튼 박서 팬티 세트", "fashion"),
            ("오리온 과자 스낵 모음", "food"),
            ("코카콜라 제로 사이다 음료 세트", "food"),
            ("지방 연소제 수면 보조제 영양 보충제", "health"),
            ("리큐 세탁세제 2L", "living"),
            ("미샤 앰플 미스트 세트", "beauty"),
            ("삼성 SSD 1TB", "digital"),
            ("갤럭시 버즈 케이스", "mobile"),
            ("LG 냉장고", "appliance"),
        ]
        for title, expected in cases:
            with self.subTest(title=title):
                self.check_slug(title, expected)

    def test_ambiguous_substrings_and_book_merchants(self):
        self.assertEqual(classify_slug("쇼펜하우어 인생수업", "food", "YES24"), "books")
        self.assertEqual(classify_slug("제브라 마일드라이너 형광펜 세트", "fashion", "YES24"), "living")
        self.assertEqual(classify_slug("파스텔 냉장고 자석", "appliance", "YES24"), "living")
        self.assertEqual(classify_slug("내일이 달라지는 수면 과학", "living", "예스24"), "books")
        self.assertEqual(classify_slug("2026 봉투모의고사", "living", "교보문고"), "books")
        self.assertEqual(classify_slug("제주 생수 2L 12병", "living"), "food")
        self.assertEqual(classify_slug("스포츠브라 2매", "living"), "fashion")
        self.assertEqual(classify_slug("원목 책상", "living"), "living")
        self.assertEqual(classify_slug("수족관 물고기 히터", "living"), "appliance")
        self.assertEqual(classify_slug("버터플라이 나이프 보관 케이스", "living"), "living")
        self.assertEqual(classify_slug("귀여운 만화 PVC 목욕 매트", "living"), "living")
        self.assertEqual(classify_slug("블루투스 헤드폰 음악 플레이어", "living"), "digital")
        self.assertEqual(classify_slug("독도 에디션 만년필", "books", "YES24"), "living")
        self.assertEqual(classify_slug("집중력 향상 스터디 타이머", "books", "YES24"), "living")

    def test_brand_and_display_title_are_conservative(self):
        self.assertEqual(brand_from("P-6000 CD6404-002 : 롯데ON"), "나이키")
        self.assertEqual(brand_from("남여 고어텍스 다운 M히마GTX히팅다운자켓 1BYPAW3008 : 롯데ON"), "블랙야크")
        self.assertIsNone(brand_from("좋은 양말 10켤레 세트"))
        self.assertEqual(display_title("NEW패턴 TRY 스탠다드 코튼 박서 5매 세트 : 롯데ON"), "TRY 스탠다드 코튼 박서 5매 세트")


if __name__ == "__main__":
    unittest.main()
