"""LinkPrice price-feed publication policy.

Only merchants that are both approved for this account and currently expose a
documented product-price feed may enter Dropped's price history.  Travel and
other approved CPS programs still use deep links, but are not treated as price
feeds.
"""
import re

APPROVED_PRICE_MERCHANTS = {
    "11st",
    "yes24",
    "gmarket",
    "himart",
    "iherb",
    "wconcept",
}

MERCHANT_NAMES = {
    "11st": "11번가",
    "yes24": "YES24",
    "gmarket": "G마켓",
    "himart": "롯데하이마트",
    "iherb": "아이허브",
    "wconcept": "W컨셉",
}


def approved(merchant_id: str) -> bool:
    return merchant_id.strip().lower() in APPROVED_PRICE_MERCHANTS


def product_identity(merchant_id: str, product_code: object) -> str:
    """Use one identity across LinkPrice's product and real-hotdeal feeds."""
    return f"lp_{merchant_id.strip().lower()}_{str(product_code or '').strip()}"


_GAME_PRODUCT = re.compile(
    r"(?:steam|스팀\s*(?:키|코드|게임)|pc\s*게임|게임\s*타이틀|"
    r"(?:ps4|ps5|playstation|플레이스테이션)\s*(?:게임|타이틀|소프트)|"
    r"(?:닌텐도\s*스위치|nintendo\s*switch)\s*(?:게임|타이틀|소프트))",
    re.IGNORECASE,
)


def is_game_product(title: object) -> bool:
    """Game software belongs to PlayMarket; peripherals may remain shopping deals."""
    return bool(_GAME_PRODUCT.search(str(title or "")))
