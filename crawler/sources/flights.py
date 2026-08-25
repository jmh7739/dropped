"""항공권 특가 수집기 — 실제 요금 API 기반.

네이버 항공권 직접 크롤링은 봇 차단·ToS 문제로 불안정하므로,
Travelpayouts(아비아세일즈) 공개 요금 API를 사용한다.
- 가입이 쉽고(무료) 어필리에이트 마커까지 제공
- 출발지별 '최근 최저가' 목록을 노선·날짜와 함께 반환
- 예약 링크에 marker를 붙이면 예약 발생 시 수수료

토큰이 없으면 빈 목록을 반환한다.
문서: travelpayouts.com > Aviasales Data API (get_latest_prices 등)
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
import time

import requests
import config

# 한국 도시/공항 코드 — 도착지가 여기면 국내선
KR_AIRPORTS = {"SEL", "ICN", "GMP", "PUS", "CJU", "TAE", "KWJ", "USN",
               "RSU", "HIN", "WJU", "YNY", "MWX", "KUV"}
# 출발지(우리가 훑을 한국 출발). API가 SEL(서울권)로 묶어줌
ORIGINS = ["SEL", "PUS", "CJU"]
# 코드 → 한글 도시명(표시용, 없으면 코드 그대로)
CITY_KO = {
    "SEL": "서울", "ICN": "인천", "GMP": "김포", "PUS": "부산", "CJU": "제주",
    "TAE": "대구",
    "TYO": "도쿄", "NRT": "도쿄", "HND": "도쿄", "OSA": "오사카", "KIX": "오사카",
    "FUK": "후쿠오카", "SPK": "삿포로", "CTS": "삿포로", "OKA": "오키나와",
    "BKK": "방콕", "DAD": "다낭", "SGN": "호치민", "HAN": "하노이", "CEB": "세부",
    "TPE": "타이베이", "HKG": "홍콩", "SIN": "싱가포르", "MNL": "마닐라",
    "BJS": "베이징", "SHA": "상하이", "KUL": "쿠알라룸푸르", "DPS": "발리",
    "LAX": "로스앤젤레스", "JFK": "뉴욕", "CDG": "파리", "LHR": "런던",
}

API = "https://api.travelpayouts.com/aviasales/v3/get_latest_prices"


@dataclass
class FlightItem:
    source: str
    external_id: str
    origin: str
    destination: str
    depart_date: Optional[str]
    return_date: Optional[str]
    airline: Optional[str]
    price: Optional[int]
    is_domestic: bool
    deal_url: str
    posted_at: Optional[str]


def _ko(iata: str) -> str:
    return CITY_KO.get(iata, iata)


def _ddmm(d: Optional[str]) -> str:
    """'YYYY-MM-DD' → 'DDMM' (아비아세일즈 검색 경로 형식)."""
    return (d[8:10] + d[5:7]) if d and len(d) >= 10 else ""


def _booking_url(origin: str, dest: str, depart: str, ret: Optional[str]) -> str:
    # 아비아세일즈 검색 URL + 어필리에이트 마커. 경로: 출발+DDMM+도착+DDMM+인원
    path = f"{origin}{_ddmm(depart)}{dest}{_ddmm(ret)}1"
    return f"https://www.aviasales.com/search/{path}?marker={config.TRAVELPAYOUTS_MARKER}"


def _fetch_origin(origin: str) -> list[FlightItem]:
    params = {
        "currency": "krw",
        "origin": origin,
        "period_type": "month",
        "one_way": "false",
        "limit": 30,
        "sorting": "price",
        "token": config.TRAVELPAYOUTS_TOKEN,
    }
    resp = requests.get(API, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json().get("data", [])
    items: list[FlightItem] = []
    for d in data:
        dest = d.get("destination", "")
        depart = (d.get("depart_date") or "")[:10] or None   # 날짜만(YYYY-MM-DD)
        ret = (d.get("return_date") or "")[:10] or None
        items.append(FlightItem(
            source="아비아세일즈",
            external_id=f"{origin}-{dest}-{depart}",
            origin=_ko(origin),
            destination=_ko(dest),
            depart_date=depart,
            return_date=ret,
            airline=d.get("airline"),
            price=int(d.get("value", 0)) or None,
            is_domestic=dest in KR_AIRPORTS,
            deal_url=_booking_url(origin, dest, depart, ret),
            posted_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
        ))
    return items


def fetch() -> list[FlightItem]:
    if not config.TRAVELPAYOUTS_TOKEN:
        print("[flights] TRAVELPAYOUTS_TOKEN 없음 → 건너뜀")
        return []

    all_items: list[FlightItem] = []
    for origin in ORIGINS:
        try:
            got = _fetch_origin(origin)
            print(f"[flights] {origin} 출발 {len(got)}건")
            all_items.extend(got)
        except requests.RequestException as e:
            print(f"[flights] {origin} 실패: {e}")
        time.sleep(1)
    return all_items
