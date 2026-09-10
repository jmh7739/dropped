"""Validate before adding an observation to the existing price history."""
from __future__ import annotations

from statistics import median

QUALITY_VERSION = "price-quality-v1"


def validate_price(raw, history: list[int] | None = None) -> tuple[str, list[str]]:
    reasons = []
    if isinstance(raw.current_price, bool) or not isinstance(raw.current_price, int):
        return "quarantined", ["invalid_price_type"]
    if raw.current_price <= 0 or raw.current_price > 1_000_000_000_000:
        return "quarantined", ["invalid_price"]
    if raw.currency != "KRW":
        return "quarantined", ["unsupported_currency"]
    if raw.stock_status not in ("unknown", "in_stock", "out_of_stock"):
        return "quarantined", ["invalid_stock_status"]
    if raw.stock_status == "out_of_stock":
        return "quarantined", ["out_of_stock"]
    if raw.quantity is not None and (type(raw.quantity) is not int or raw.quantity <= 0):
        return "quarantined", ["invalid_quantity"]
    if raw.shipping_fee is not None and (type(raw.shipping_fee) is not int or raw.shipping_fee < 0):
        return "quarantined", ["invalid_shipping_fee"]
    if raw.price_basis not in ("unknown", "public", "coupon", "card", "member", "option_min"):
        return "quarantined", ["invalid_price_basis"]
    if raw.price_basis in ("coupon", "card", "member", "option_min"):
        return "quarantined", ["conditional_price"]
    if raw.list_price is not None and (type(raw.list_price) is not int or raw.list_price < raw.current_price):
        reasons.append("invalid_reference_price")
    if raw.option_key is None or raw.quantity is None or raw.price_basis == "unknown":
        reasons.append("conditions_unconfirmed")
    if raw.shipping_fee is None:
        reasons.append("shipping_unconfirmed")
    clean = [p for p in (history or []) if type(p) is int and p > 0]
    if len(clean) >= 4 and raw.current_price < median(clean) * 0.1:
        return "quarantined", ["extreme_price_drop"]
    return ("warning" if reasons else "valid"), reasons
