import unittest

from sources.linkprice_policy import usable_product_image, usable_product_title


class LinkPricePresentationQualityTests(unittest.TestCase):
    def test_internal_product_codes_are_rejected(self):
        self.assertFalse(usable_product_title("LEX23166"))
        self.assertFalse(usable_product_title("CGN01330"))
        self.assertTrue(usable_product_title("내일이 달라지는 수면 과학"))

    def test_merchant_logo_is_not_used_as_a_product_photo(self):
        logo = "https://img.linkprice.com/files/glink/himart/20230907/logo_120x60.png"
        photo = "https://static.e-himart.co.kr/goods/product_640.jpg"
        self.assertFalse(usable_product_image(logo))
        self.assertTrue(usable_product_image(photo))


if __name__ == "__main__":
    unittest.main()
