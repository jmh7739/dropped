"""경매 특가 수집기 — 부동산/자동차 법원경매 (공공데이터).

데이터 출처: 공공데이터포털(data.go.kr)의 법원경매/부동산경매 API.
- 서비스키 발급(무료) 후 사용
- 제휴 링크가 없는 카테고리 → 광고/구독으로 수익화
- '감정가 대비 최저입찰가'가 낮을수록(유찰 누적) 특가

키가 없으면 빈 목록을 반환한다.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
import time

import requests
import config


@dataclass
class AuctionItem:
    source: str
    external_id: str
    case_no: Optional[str]
    asset_type: str            # '부동산' | '자동차'
    title: str
    location: Optional[str]
    appraisal_price: Optional[int]
    min_bid_price: Optional[int]
    fail_count: int
    bid_date: Optional[str]    # 'YYYY-MM-DD'
    detail_url: str
    posted_at: Optional[str]


# 공공데이터포털 엔드포인트는 발급받은 API별로 다르므로 실제 값으로 교체.
API = "https://apis.data.go.kr/1270000/AuctionInfo/getAuctionList"


def fetch() -> list[AuctionItem]:
    if not config.DATA_GO_KR_KEY:
        print("[auction] DATA_GO_KR_KEY 없음 → 건너뜀")
        return []

    # TODO: 실제 공공데이터포털 응답 구조에 맞춰 파싱.
    #   params = {"serviceKey": config.DATA_GO_KR_KEY, "numOfRows": 100, ...}
    #   resp = requests.get(API, params=params, timeout=15)
    #   for row in resp.json()[...]: map → AuctionItem
    print("[auction] 실피드 미구현 — data.go.kr 경매 API를 연결하세요")
    return []
