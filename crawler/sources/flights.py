"""항공권 특가 수집기 — 실제 요금 API 기반.

Travelpayouts(아비아세일즈) 공개 요금 API로 한국 출발 왕복 최저가를 수집.
- get_latest_prices 를 '다음 N개월' 반복 조회 → 같은 노선도 날짜(월)별 최저가 확보
- 목적지는 큐레이션된 한글맵(DEST)에 있는 곳만 노출 → 코드 노출/무의미 노선(포항 등) 자동 제외
- 지역(국내/일본/동남아/중화권/유럽/미주/오세아니아)으로 분류 → 프론트 드릴다운

토큰이 없으면 빈 목록을 반환한다.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import date
from typing import Optional
import time

import requests
import config

# 출발지(한국). API가 SEL=서울권으로 묶어줌.
ORIGINS = {"SEL": "서울", "PUS": "부산", "CJU": "제주", "TAE": "대구"}

# 목적지 코드 → (한글명, 지역). 여기 없는 목적지는 노출하지 않는다.
#   → '목적지 무조건 한글' 보장 + 잡음/무의미 노선(포항 KPO 등) 자동 제거.
DEST: dict[str, tuple[str, str]] = {
    # 국내
    "GMP": ("김포", "국내"), "SEL": ("서울", "국내"), "ICN": ("인천", "국내"),
    "CJU": ("제주", "국내"), "PUS": ("부산", "국내"), "TAE": ("대구", "국내"),
    "KWJ": ("광주", "국내"), "USN": ("울산", "국내"), "RSU": ("여수", "국내"),
    "CJJ": ("청주", "국내"), "YNY": ("양양", "국내"),
    # 일본
    "TYO": ("도쿄", "일본"), "NRT": ("도쿄", "일본"), "HND": ("도쿄", "일본"),
    "OSA": ("오사카", "일본"), "KIX": ("오사카", "일본"), "FUK": ("후쿠오카", "일본"),
    "SPK": ("삿포로", "일본"), "CTS": ("삿포로", "일본"), "OKA": ("오키나와", "일본"),
    "NGO": ("나고야", "일본"), "KOJ": ("가고시마", "일본"), "KMJ": ("구마모토", "일본"),
    "HIJ": ("히로시마", "일본"), "KMQ": ("고마쓰", "일본"), "TAK": ("다카마쓰", "일본"),
    "OIT": ("오이타", "일본"),
    # 중화권
    "TPE": ("타이베이", "중화권"), "KHH": ("가오슝", "중화권"), "HKG": ("홍콩", "중화권"),
    "MFM": ("마카오", "중화권"), "BJS": ("베이징", "중화권"), "PEK": ("베이징", "중화권"),
    "SHA": ("상하이", "중화권"), "PVG": ("상하이", "중화권"), "CAN": ("광저우", "중화권"),
    "TAO": ("칭다오", "중화권"), "SZX": ("선전", "중화권"), "XMN": ("샤먼", "중화권"),
    # 동남아
    "BKK": ("방콕", "동남아"), "DMK": ("방콕", "동남아"), "DAD": ("다낭", "동남아"),
    "SGN": ("호치민", "동남아"), "HAN": ("하노이", "동남아"), "CXR": ("나트랑", "동남아"),
    "PQC": ("푸꾸옥", "동남아"), "CEB": ("세부", "동남아"), "MNL": ("마닐라", "동남아"),
    "SIN": ("싱가포르", "동남아"), "KUL": ("쿠알라룸푸르", "동남아"), "DPS": ("발리", "동남아"),
    "BKI": ("코타키나발루", "동남아"), "REP": ("씨엠립", "동남아"), "PNH": ("프놈펜", "동남아"),
    "VTE": ("비엔티안", "동남아"), "HKT": ("푸켓", "동남아"), "CNX": ("치앙마이", "동남아"),
    "CRK": ("클락", "동남아"), "PEN": ("페낭", "동남아"), "TAG": ("보홀", "동남아"),
    "USM": ("코사무이", "동남아"), "LGK": ("랑카위", "동남아"),
    # 유럽
    "CDG": ("파리", "유럽"), "LHR": ("런던", "유럽"), "FRA": ("프랑크푸르트", "유럽"),
    "MUC": ("뮌헨", "유럽"), "FCO": ("로마", "유럽"), "MXP": ("밀라노", "유럽"),
    "BCN": ("바르셀로나", "유럽"), "MAD": ("마드리드", "유럽"), "AMS": ("암스테르담", "유럽"),
    "ZRH": ("취리히", "유럽"), "VIE": ("빈", "유럽"), "PRG": ("프라하", "유럽"),
    "IST": ("이스탄불", "유럽"), "LIS": ("리스본", "유럽"),
    # 미주
    "LAX": ("로스앤젤레스", "미주"), "JFK": ("뉴욕", "미주"), "EWR": ("뉴욕", "미주"),
    "SFO": ("샌프란시스코", "미주"), "SEA": ("시애틀", "미주"), "HNL": ("호놀룰루", "미주"),
    "LAS": ("라스베이거스", "미주"), "ORD": ("시카고", "미주"), "YVR": ("밴쿠버", "미주"),
    "YYZ": ("토론토", "미주"), "GUM": ("괌", "미주"), "SPN": ("사이판", "미주"),
    # 오세아니아
    "SYD": ("시드니", "오세아니아"), "MEL": ("멜버른", "오세아니아"),
    "BNE": ("브리즈번", "오세아니아"), "AKL": ("오클랜드", "오세아니아"),
    # 중동
    "DXB": ("두바이", "중동"), "DOH": ("도하", "중동"), "AUH": ("아부다비", "중동"),
}

API = "https://api.travelpayouts.com/aviasales/v3/get_latest_prices"


@dataclass
class FlightItem:
    source: str
    external_id: str
    origin: str
    destination: str
    region: str
    depart_date: Optional[str]
    return_date: Optional[str]
    airline: Optional[str]
    price: Optional[int]
    is_domestic: bool
    deal_url: str
    posted_at: Optional[str]


def _ddmm(d: Optional[str]) -> str:
    """'YYYY-MM-DD' → 'DDMM' (아비아세일즈 검색 경로 형식)."""
    return (d[8:10] + d[5:7]) if d and len(d) >= 10 else ""


def _nights(depart: Optional[str], ret: Optional[str]) -> Optional[int]:
    """왕복 숙박수(오는날-가는날). 편도/파싱실패면 None."""
    if not depart or not ret:
        return None
    try:
        return (date.fromisoformat(ret) - date.fromisoformat(depart)).days
    except ValueError:
        return None


def _realistic(region: str, depart: Optional[str], ret: Optional[str]) -> bool:
    """해외는 당일치기/1박2일 비현실적 → 지역별 최소 숙박수·최대 한달 필터. 국내는 통과."""
    if region == "국내":
        return True
    nights = _nights(depart, ret)
    if nights is None:
        return False  # 해외인데 왕복일정 불명 → 제외
    lo = config.FLIGHT_MIN_NIGHTS.get(region, 3)
    return lo <= nights <= config.FLIGHT_MAX_NIGHTS


def _booking_url(o_code: str, d_code: str, depart: str, ret: Optional[str]) -> str:
    path = f"{o_code}{_ddmm(depart)}{d_code}{_ddmm(ret)}1"
    return f"https://www.aviasales.com/search/{path}?marker={config.TRAVELPAYOUTS_MARKER}"


def _months(n: int) -> list[str]:
    """다음 n개월의 1일(YYYY-MM-01) 목록."""
    out = []
    y, m = date.today().year, date.today().month
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}-01")
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


def _fetch(origin_code: str, origin_ko: str, month: str) -> list[FlightItem]:
    params = {
        "currency": "krw",
        "origin": origin_code,
        "period_type": "month",
        "beginning_of_period": month,
        "one_way": "false",
        "limit": 1000,
        "sorting": "price",
        "token": config.TRAVELPAYOUTS_TOKEN,
    }
    resp = requests.get(API, params=params, timeout=20)
    resp.raise_for_status()
    items: list[FlightItem] = []
    for d in resp.json().get("data", []):
        dcode = d.get("destination", "")
        meta = DEST.get(dcode)
        if not meta:
            continue  # 한글맵에 없는 목적지는 스킵(코드 노출 방지)
        dest_ko, region = meta
        if dest_ko == origin_ko:
            continue
        price = int(d.get("value", 0)) or None
        if not price:
            continue
        depart = (d.get("depart_date") or "")[:10] or None
        ret = (d.get("return_date") or "")[:10] or None
        if not _realistic(region, depart, ret):
            continue  # 해외 당일치기/1박2일/한달초과 제외
        items.append(FlightItem(
            source="아비아세일즈",
            external_id=f"{origin_code}-{dcode}-{depart}-{ret}",
            origin=origin_ko,
            destination=dest_ko,
            region=region,
            depart_date=depart,
            return_date=ret,
            airline=d.get("airline"),
            price=price,
            is_domestic=(region == "국내"),
            deal_url=_booking_url(origin_code, dcode, depart, ret),
            posted_at=time.strftime("%Y-%m-%dT%H:%M:%S"),
        ))
    return items


def fetch() -> list[FlightItem]:
    if not config.TRAVELPAYOUTS_TOKEN:
        print("[flights] TRAVELPAYOUTS_TOKEN 없음 → 건너뜀")
        return []

    seen: dict[str, FlightItem] = {}
    for month in _months(config.FLIGHT_MONTHS):
        for code, ko in ORIGINS.items():
            try:
                for it in _fetch(code, ko, month):
                    seen.setdefault(it.external_id, it)
            except requests.RequestException as e:
                print(f"[flights] {code} {month} 실패: {e}")
            time.sleep(0.6)

    # 노선별로 너무 많으면 날짜 최저가 상위만 유지 → 목록 과다 방지
    by_route: dict[tuple[str, str], list[FlightItem]] = {}
    for it in seen.values():
        by_route.setdefault((it.origin, it.destination), []).append(it)
    out: list[FlightItem] = []
    for items in by_route.values():
        items.sort(key=lambda x: x.price or 10**12)
        out.extend(items[: config.FLIGHT_DATES_PER_ROUTE])
    print(f"[flights] {len(out)}건 ({len(by_route)}개 노선, 월 {config.FLIGHT_MONTHS}개월)")
    return out
