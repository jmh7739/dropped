"""국내몰 특가 수집기 (링크프라이스 CPS 제휴).

G마켓·11번가·위메프·SSG 등 국내몰의 특가를 수집하고, 상품 URL을
링크프라이스 제휴 링크로 변환해 '우리 수익'이 발생하도록 한다.

특가 '목록' 자체를 어디서 얻느냐:
  (A) 링크프라이스가 제공하는 머천트 상품/프로모션 피드 (계정별)
  (B) 각 몰의 공식 오픈API / 기획전 페이지
  → 계정·제휴 승인 후 연결.

변환 자체(affiliate.to_affiliate)는 URL 템플릿이라 키만 있으면 바로 동작.
"""
from __future__ import annotations

import config
import affiliate
from .base import RawDeal


def _mall_from_url(url: str) -> str:
    hit = affiliate.detect_mall(url)
    return hit[0] if hit else "국내몰"


def fetch() -> list[RawDeal]:
    if not config.LINKPRICE_AFFILIATE_ID:
        print("[cps] LINKPRICE_AFFILIATE_ID 없음 → 건너뜀")
        return []

    # TODO: 링크프라이스 머천트 상품/프로모션 피드 또는 각 몰 오픈API 연결.
    #       수집한 각 상품 URL을 affiliate.to_affiliate(url)로 변환해 사용.
    print("[cps] 실피드 미구현 — 링크프라이스 머천트 피드를 연결하세요")
    return []
