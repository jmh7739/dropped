"""경매 특가 수집기 — 온비드(캠코) 공매 부동산/자동차 (공공데이터포털).

데이터 출처: data.go.kr 차세대 온비드 물건목록 조회서비스
  - 부동산: OnbidRlstListSrvc2/getRlstCltrList2
  - 자동차: OnbidCarListSrvc2/getCarCltrList2
인증: 서비스키(config.DATA_GO_KR_KEY, URL-decode된 원본). requests가 인코딩.

'떨어졌다' 철학: 유찰이 쌓여 회차마다 최저입찰가가 깎인 물건만 노출.
  → usbdNftStart(유찰 최소횟수)로 1차 필터 + 감정가 대비 하락률로 2차 필터.
제휴 링크가 없는 카테고리라 클릭은 온비드 물건 상세로 연결(수익은 광고/구독).

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


BASE = "https://apis.data.go.kr/B010003"
# (자산유형, 오퍼레이션 경로)
SERVICES = [
    ("부동산", "OnbidRlstListSrvc2/getRlstCltrList2"),
    ("자동차", "OnbidCarListSrvc2/getCarCltrList2"),
]

# 노출 제외할 입찰상태(끝났거나 무의미): 낙찰/취소/입찰마감/개찰중
_SKIP_STATUS = {"0003", "0006", "0010", "0012"}


def _detail_url(it: dict) -> str:
    """온비드 물건 상세 딥링크 (목록 API가 주는 ID들로 구성 → 200 확인됨)."""
    return (
        "https://www.onbid.co.kr/op/cltrpbancinf/cltrdtl/CltrDtlController/"
        f"mvmnCltrDtl.do?onbidCltrno={it.get('onbidCltrno')}"
        f"&onbidPbancNo={it.get('onbidPbancNo')}"
        f"&pbctNo={it.get('pbctNo')}&pbctCdtnNo={it.get('pbctCdtnNo')}"
    )


def _to_int(v) -> Optional[int]:
    """'5376000' → 5376000, '비공개'/None → None."""
    if v is None:
        return None
    s = str(v).strip().replace(",", "")
    return int(s) if s.isdigit() else None


def _bid_date(yyyymmddhhmm: Optional[str]) -> Optional[str]:
    if not yyyymmddhhmm or len(str(yyyymmddhhmm)) < 8:
        return None
    s = str(yyyymmddhhmm)
    return f"{s[0:4]}-{s[4:6]}-{s[6:8]}"


def _location(it: dict) -> Optional[str]:
    parts = [it.get("lctnSdnm"), it.get("lctnSggnm"), it.get("lctnEmdNm")]
    joined = " ".join(p for p in parts if p)
    return joined or None


def _call(path: str, page_no: int) -> list[dict]:
    url = f"{BASE}/{path}"
    params = {
        "serviceKey": config.DATA_GO_KR_KEY,
        "pageNo": page_no,
        "numOfRows": config.AUCTION_ROWS,
        "resultType": "json",
        "prptDivCd": config.AUCTION_PROPERTY_DIVS,
        "pvctTrgtYn": "N",
        "usbdNftStart": config.AUCTION_MIN_FAILS,  # 최소 유찰횟수(가격 하락 누적)
    }
    for attempt in range(3):
        try:
            resp = requests.get(url, params=params, timeout=20)
            resp.raise_for_status()
            body = resp.json().get("body") or {}
            items = (body.get("items") or {}).get("item")
            if items is None:
                return []
            return items if isinstance(items, list) else [items]
        except (requests.RequestException, ValueError):
            if attempt == 2:
                return []
            time.sleep(2 ** attempt)
    return []


def fetch() -> list[AuctionItem]:
    if not config.DATA_GO_KR_KEY:
        print("[auction] DATA_GO_KR_KEY 없음 → 건너뜀")
        return []

    seen: dict[str, tuple[float, AuctionItem]] = {}
    for asset_type, path in SERVICES:
        for page in range(1, config.AUCTION_PAGES + 1):
            rows = _call(path, page)
            if not rows:
                break
            for it in rows:
                if str(it.get("pbctStatCd")) in _SKIP_STATUS:
                    continue
                appraisal = _to_int(it.get("apslEvlAmt"))
                min_bid = _to_int(it.get("lowstBidPrcIndctCont"))
                # 감정가·최저가 둘 다 있고, 최저가가 감정가보다 낮아야 '떨어진' 물건
                if not appraisal or not min_bid or min_bid >= appraisal:
                    continue
                drop = (appraisal - min_bid) / appraisal
                if drop < config.AUCTION_MIN_DROP:
                    continue
                ext = it.get("cltrMngNo") or str(it.get("onbidCltrno"))
                if ext in seen:
                    continue
                seen[ext] = (drop, AuctionItem(
                    source="onbid",
                    external_id=ext,
                    case_no=it.get("cltrMngNo"),
                    asset_type=asset_type,
                    title=(it.get("onbidCltrNm") or "").strip(),
                    location=_location(it),
                    appraisal_price=appraisal,
                    min_bid_price=min_bid,
                    fail_count=_to_int(it.get("usbdNft")) or 0,
                    bid_date=_bid_date(it.get("cltrBidEndDt")),
                    detail_url=_detail_url(it),
                    posted_at=None,
                ))
            time.sleep(0.3)

    # 하락률 높은 순으로 정렬 후 상한 컷
    ranked = sorted(seen.values(), key=lambda t: t[0], reverse=True)
    deals = [item for _, item in ranked[: config.AUCTION_LIMIT]]
    print(f"[auction] 후보 {len(seen)}건 → 상위 {len(deals)}건 노출")
    return deals
