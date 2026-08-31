"""링크프라이스(LinkPrice) CPS 제휴 링크 변환기.

링크프라이스는 국내 CPS 제휴 네트워크로, 한 번 가입하면 G마켓·11번가·위메프·
옥션·SSG·롯데온·인터파크 등 수십 개 쇼핑몰의 제휴(추적) 링크를 만들 수 있다.

핵심: 어떤 쇼핑몰 상품 URL이든 아래 클릭 추적 URL로 감싸면 우리 수익이 발생.
  https://click.linkprice.com/click.php?m={merchant}&a={affiliate}&l=0000&tu={url}

⚠️ 각 쇼핑몰의 merchant 코드(m 값)와 본인 affiliate id(a 값)는 링크프라이스
   가입 후 발급받아 아래 MERCHANTS와 env에 채우세요. (지금은 예시값)
"""
from __future__ import annotations
from urllib.parse import quote, urlparse

import config

# 도메인 → (표시용 쇼핑몰명, 링크프라이스 merchant 코드)
# 현재 계정에서 쓰는 상품/핫딜 피드의 merchant_id와 여행 딥링크 코드를 함께 둔다.
# 새 승인 몰은 여기에 도메인만 추가하면 네이버·외부 후보 링크도 제휴 링크로 바뀐다.
MERCHANTS = {
    "gmarket.co.kr":     ("G마켓", "gmarket"),
    "auction.co.kr":     ("옥션", "auction"),
    "11st.co.kr":        ("11번가", "11st"),
    "wemakeprice.com":   ("위메프", "wemakeprice"),
    "ssg.com":           ("SSG", "ssg"),
    "emart.ssg.com":     ("이마트", "emart"),
    "lotteon.com":       ("롯데온", "lotteon"),
    "interpark.com":     ("인터파크", "interpark"),
    "ohou.se":           ("오늘의집", "ohouse"),
    "oliveyoung.co.kr":  ("올리브영", "oliveyoung"),
    "wconcept.co.kr":    ("W컨셉", "wconcept"),
    "iherb.com":         ("아이허브", "iherb"),
    "e-himart.co.kr":    ("하이마트", "himart"),
    "himart.co.kr":      ("하이마트", "himart"),
    "yes24.com":         ("예스24", "yes24"),
    "kyobobook.co.kr":   ("교보문고", "kbbook"),
    "gsshop.com":        ("GS SHOP", "gsshop"),
    "hmall.com":         ("Hmall", "hmall"),
    "nsmall.com":        ("NS홈쇼핑", "nsmall"),
    "gongyoungshop.kr":  ("공영홈쇼핑", "gongyoung"),
    "lotteimall.com":    ("롯데홈쇼핑", "lotteimall"),
    "agoda.com":         ("아고다", "agoda"),
    "yanolja.com":       ("야놀자", "yanolja"),
    "hotelscombined.com": ("호텔스컴바인", "hcombine2"),
    "hotels.com":        ("호텔스닷컴", "hotelskr"),
    "travel.rakuten.com": ("라쿠텐 트래블", "rakutentr"),
    "klook.com":         ("클룩", "klook"),
    "airalo.com":        ("에어알로", "airalo"),
    "myrealtrip.com":    ("마이리얼트립", "myrealtrip"),
    "ttang.com":         ("땡처리닷컴", "072com"),
    "kkday.com":         ("KKday", "kkday"),
    "gocity.com":        ("Go City", "gocity"),
    "raileurope.co.kr":  ("레일유럽", "re4akor"),
}

# 상품/핫딜 API가 주는 merchant_id → 화면 표시명.
MERCHANT_NAMES = {
    merchant: name for name, merchant in MERCHANTS.values()
}
# 인기상품(popularProducts) 피드의 머천트 코드 → 표시명 보강
MERCHANT_NAMES.update({
    "halfclub1": "하프클럽", "ohouse": "오늘의집", "lotteon": "롯데온",
    "gmarket": "G마켓", "himart": "하이마트", "11st": "11번가",
})


def detect_mall(url: str) -> tuple[str, str] | None:
    """URL 도메인으로 지원 쇼핑몰인지 판별 → (쇼핑몰명, merchant코드) 또는 None."""
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return None
    for domain, info in MERCHANTS.items():
        # example-gmarket.co.kr 같은 유사 도메인 오인식을 막는다.
        if host == domain or host.endswith("." + domain):
            return info
    return None


def merchant_name(merchant: str) -> str:
    """LinkPrice merchant_id를 사람이 읽을 수 있는 쇼핑몰명으로."""
    return MERCHANT_NAMES.get(merchant, merchant)


def to_affiliate(url: str) -> tuple[str, str] | None:
    """지원 쇼핑몰 URL이면 (제휴링크, 쇼핑몰명) 반환. 아니면 None."""
    hit = detect_mall(url)
    if not hit or not config.LINKPRICE_AFFILIATE_ID:
        return None
    mall_name, merchant = hit
    aff = (
        "https://click.linkprice.com/click.php"
        f"?m={merchant}&a={config.LINKPRICE_AFFILIATE_ID}"
        f"&l=0000&tu={quote(url, safe='')}"
    )
    return aff, mall_name
