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
# merchant 코드는 링크프라이스 계정에서 확인한 실제 값으로 교체할 것.
# ✅ = 링크프라이스에서 승인 확인됨(merchant 코드 검증). 나머지는 승인 후 코드 확인 필요.
MERCHANTS = {
    "gmarket.co.kr":     ("G마켓", "gmarket"),    # ✅ 승인됨
    "agoda.com":         ("아고다", "agoda"),      # ✅ 승인됨(숙박)
    "yanolja.com":       ("야놀자", "yanolja"),    # ✅ 승인됨(숙박)
    "nol.yanolja.com":   ("야놀자", "yanolja"),    # ✅
    "auction.co.kr":     ("옥션", "auction"),
    "11st.co.kr":        ("11번가", "11st"),
    "wemakeprice.com":   ("위메프", "wemakeprice"),
    "ssg.com":           ("SSG", "ssg"),
    "lotteon.com":       ("롯데온", "lotteon"),
    "interpark.com":     ("인터파크", "interpark"),
    "ohou.se":           ("오늘의집", "ohouse"),
    "oliveyoung.co.kr":  ("올리브영", "oliveyoung"),
}


def detect_mall(url: str) -> tuple[str, str] | None:
    """URL 도메인으로 지원 쇼핑몰인지 판별 → (쇼핑몰명, merchant코드) 또는 None."""
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return None
    for domain, info in MERCHANTS.items():
        if domain in host:
            return info
    return None


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
