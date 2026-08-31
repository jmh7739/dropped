"""가격 이상탐지 · 가격오류 가드레일 · 딜 판정 로직.

핵심 아이디어:
- 원인(진짜 할인이든 가격오류든)에 상관없이 "평소보다 비정상적으로 싸다"를 잡는다.
- 단, 우리 수집 버그를 '오류딜'로 오인 노출하지 않도록 가드레일을 둔다.
"""
from __future__ import annotations
from dataclasses import dataclass
from statistics import mean, median
from typing import Optional

import config


@dataclass
class DealVerdict:
    is_deal: bool             # 노출할 딜인가
    baseline_price: Optional[int]
    discount_vs_avg: Optional[float]   # 평균 대비 하락률 (%)
    discount_vs_list: Optional[float]  # 정가 대비 하락률 (%)
    is_lowest_ever: bool
    is_price_error: bool      # 가격오류 의심 플래그
    reason: str               # 판정 근거(로그용)


def compute_baseline(history_prices: list[int]) -> Optional[int]:
    """최근 이력으로 평소 기준가 계산. 이력이 없으면 None."""
    if not history_prices:
        return None
    if config.BASELINE_METHOD == "mean":
        return round(mean(history_prices))
    return round(median(history_prices))


def classify(
    current_price: int,
    list_price: Optional[int],
    history_prices: list[int],
    history_days: float,
    platform: str = "",
) -> DealVerdict:
    """신뢰 우선 판정.

    - 확정 기준은 오직 '평소 실제 판매가(이력 평균/중앙값) 대비 하락률'.
    - 정가(list_price) 대비는 뻥튀기 정가에 속으므로 판정에 쓰지 않고 표시용으로만.
    - 이력이 부족하면 확정하지 않고 '관찰중'으로 둔다(가격은 계속 수집).
    - 모든 플랫폼 동일: 오직 실제 가격추적(평소가 대비)만 신뢰. 거짓정가 없음.
    """

    # 정가 대비 — 표시(참고)용으로만 계산. 판정엔 안 씀.
    discount_vs_list = None
    if list_price and list_price > 0:
        discount_vs_list = min(round((list_price - current_price) / list_price * 100, 2), 999999.99)

    baseline = compute_baseline(history_prices)
    discount_vs_avg = None
    if baseline and baseline > 0:
        discount_vs_avg = min(round((baseline - current_price) / baseline * 100, 2), 999999.99)

    is_lowest = bool(history_prices) and current_price <= min(history_prices)
    n = len(history_prices)

    if current_price < config.MIN_PRICE:
        return DealVerdict(False, baseline, discount_vs_avg, discount_vs_list,
                           is_lowest, False, f"현재가 {current_price} < 최소가 컷")

    has_history = (n >= config.MIN_HISTORY_POINTS
                   and history_days >= config.MIN_HISTORY_DAYS
                   and baseline is not None)

    # 가격 변동성 가드: 최고/최저가 배수가 크면(널뛰는 가격) baseline 오염 → 가짜 급락.
    #   (예: 25,500 → 50,000 → 22,000 처럼 위로 튀는 알리 가격) 신뢰불가로 보류.
    if has_history and history_prices:
        lo = min(history_prices)
        if lo > 0 and max(history_prices) / lo > config.MAX_PRICE_VOLATILITY:
            return DealVerdict(False, baseline, discount_vs_avg, discount_vs_list,
                               is_lowest, False,
                               f"가격 변동성 과다({max(history_prices)/lo:.1f}배) → 신뢰불가 보류")

    if has_history:
        # ── 1순위: 평소 실제가 대비 (신뢰 지표) ──────────────
        rate = (discount_vs_avg or 0) / 100
        if rate > config.ERROR_HARD_CUT_DISCOUNT:
            return DealVerdict(False, baseline, discount_vs_avg, discount_vs_list,
                               is_lowest, True,
                               f"평균대비 {rate*100:.0f}% > 하드컷 → 보류")
        is_error = rate >= config.ERROR_SUSPECT_DISCOUNT
        # 알리는 노이즈가 커서 더 큰 하락만 인정 (소폭 하락 남발 방지)
        min_disc = (config.MIN_DISCOUNT_ALI if platform == "aliexpress"
                    else config.MIN_DISCOUNT)
        if rate < min_disc:
            return DealVerdict(False, baseline, discount_vs_avg, discount_vs_list,
                               is_lowest, is_error,
                               f"평균대비 {rate*100:.0f}% < 임계값({min_disc*100:.0f}%) → 딜 아님")
        return DealVerdict(True, baseline, discount_vs_avg, discount_vs_list,
                           is_lowest, is_error,
                           f"딜 확정 (평균대비 {rate*100:.0f}%)")

    # ── 이력 부족: 노출 안 함(관찰중). 정가(list_price)는 뻥튀기라 안 믿음 ──
    #   가격만 계속 수집 → 이력 충분해지면 위에서 '평소 실제가 대비'로만 판정.
    #   (거짓정가 기반 '잠정 노출'은 제거함 — 진짜 급락만 노출)
    return DealVerdict(
        False, baseline, discount_vs_avg, discount_vs_list, is_lowest, False,
        f"관찰중(이력 {n}회/{history_days:.1f}일 — 평소가 쌓는 중)")


def should_end_deal(current_price: int, baseline_price: Optional[int]) -> bool:
    """진행중 딜의 종료 판정: 현재가가 기준가 근처로 원복되면 종료."""
    if not baseline_price or baseline_price <= 0:
        return False
    discount = (baseline_price - current_price) / baseline_price
    return discount < config.END_DISCOUNT
