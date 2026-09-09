// 서버(Node ICU)와 브라우저의 toLocaleString 차이로 하이드레이션 불일치가 나서
//   결정적(deterministic) 천단위 구분으로 대체한다.
export function groupThousands(v: number): string {
  const n = Math.round(v);
  const sign = n < 0 ? "-" : "";
  return sign + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatWon(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return groupThousands(v) + "원";
}

export function formatPercent(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return `${Math.round(v)}%`;
}

/** "3시간 전", "2일 전" 같은 상대 시간 */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

/**
 * 크롤링해온 URL은 신뢰할 수 없으므로 http(s)만 허용.
 * javascript:, data:, vbscript: 등 스킴 주입을 차단한다.
 */
export function safeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "#";
}

/**
 * 대표 하락률: 실제 가격 이력(avg30Price) 우선, 없으면 DB 평균 대비, 최후 정가 대비.
 */
export function headlineDiscount(d: {
  discountVsAvg: number | null;
  discountVsList: number;
  avg30Price?: number | null;
  currentPrice?: number;
}): { rate: number; basis: "평균" | "정가" } {
  if (d.avg30Price && d.currentPrice && d.avg30Price > d.currentPrice) {
    return {
      rate: Math.round(((d.avg30Price - d.currentPrice) / d.avg30Price) * 100),
      basis: "평균",
    };
  }
  if (d.discountVsAvg !== null && d.discountVsAvg > 0) {
    return { rate: Math.round(d.discountVsAvg), basis: "평균" };
  }
  return { rate: Math.round(d.discountVsList), basis: "정가" };
}

/**
 * Deal 상태: 숫자 대신 한눈에 읽히는 상태로. (가격이력 대비 기준)
 *   🏆 최저가 / 🔥 급락 / 🟢 좋은 가격 / 📉 소폭 하락
 *   trackedDays가 짧으면 "90일 최저가"라고 단정하지 않는다.
 */
export function dealStatus(
  rate: number,
  isLowestEver: boolean,
  trackedDays?: number | null,
  basis?: "평균" | "정가"
): { label: string; cls: string } {
  const tag = basis === "정가" ? "정가 대비" : "평소 대비";
  if (rate >= 25)
    return { label: `🔥 ${tag} -${Math.round(rate)}%`, cls: "bg-red-600 text-white" };
  if (isLowestEver && rate >= 12) {
    const days = trackedDays ?? 0;
    const label =
      days >= 60 ? "🏆 역대 최저가" : days >= 14 ? "🏆 추적 최저가" : "🏆 최근 최저";
    return { label, cls: "bg-amber-400 text-amber-950" };
  }
  if (rate >= 8)
    return { label: `🟢 ${tag} -${Math.round(rate)}%`, cls: "bg-emerald-600 text-white" };
  return { label: `📉 ${tag} -${Math.round(rate)}%`, cls: "bg-sky-500 text-white" };
}

const TITLE_NOISE =
  /(?:무료\s*배송|해외\s*직구|국내\s*발송|당일\s*배송|사은품\s*증정|즉시\s*발송|빠른\s*배송)/gi;

// 몰 이름이 제목에 ': 롯데ON' 처럼 붙어오는 경우(접미) 제거용.
const MALL_SUFFIX =
  /[\s:·\-]*(?:롯데\s*ON|롯데온|G\s*마켓|지마켓|옥션|11번가|위메프|인터파크|SSG|쓱|오늘의집|하이마트|쿠팡)\s*$/gi;
// 과도한 프로모션 접두/접미 토큰(정보가치 낮음) 제거용. 1+1 등 수량정보는 보존.
const PROMO_TOKEN =
  /(?:^|\s)(?:\[[^\]]*\]|NEW신상|NEW|BEST|HOT|깜짝\s*특가|초특가|단독\s*특가|한정\s*특가|오늘의\s*특가|균일가|기획\s*특가|_NEW|_?BEST)(?=\s|$)/gi;

export function displayTitle(raw: string, maxLen = 60): string {
  let t = raw
    .replace(MALL_SUFFIX, " ")
    .replace(TITLE_NOISE, "")
    .replace(PROMO_TOKEN, " ")
    .replace(/\([^)]{0,30}\)/g, " ")
    .replace(/\[[^\]]{0,30}\]/g, " ")
    .replace(MALL_SUFFIX, " ") // 접미 몰명이 괄호 뒤에 남는 경우 한 번 더
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:·\-]+/, "")
    .trim();
  if (t.length > maxLen) {
    t = t.substring(0, maxLen - 1).replace(/\s+\S*$/, "") + "…";
  }
  return t || raw.substring(0, maxLen);
}

// ── 브랜드 사전(정규화) ─────────────────────────────────────────────
//   제목/원본명에 아래 표기 변형이 '확실히' 있으면 정규화된 한글 브랜드를 반환.
//   추측 금지: 사전에 없는 건 null. 다른 단어와 부분일치 위험이 있는 짧은/모호한
//   토큰(예: 롯데=롯데온몰, 폴로=폴로셔츠, NB, K2)은 일부러 넣지 않는다.
//   variants는 소문자로 두고, 한글은 그대로 부분일치. 긴 브랜드부터 우선 매칭.
const BRAND_DICT: { name: string; variants: string[] }[] = [
  { name: "노스페이스", variants: ["the north face", "northface", "north face", "노스페이스"] },
  { name: "뉴발란스", variants: ["new balance", "뉴발란스"] },
  { name: "블랙야크", variants: ["blackyak", "black yak", "블랙야크"] },
  { name: "나이키", variants: ["nike", "나이키"] },
  { name: "아디다스", variants: ["adidas", "아디다스"] },
  { name: "아식스", variants: ["asics", "아식스"] },
  { name: "퓨마", variants: ["puma", "푸마", "퓨마"] },
  { name: "컨버스", variants: ["converse", "컨버스"] },
  { name: "크록스", variants: ["crocs", "크록스"] },
  { name: "호카", variants: ["hoka", "호카"] },
  { name: "데상트", variants: ["descente", "데상트"] },
  { name: "휠라", variants: ["휠라"] },
  { name: "리복", variants: ["reebok", "리복"] },
  { name: "험멜", variants: ["hummel", "험멜"] },
  { name: "스케쳐스", variants: ["skechers", "스케쳐스", "스케처스"] },
  { name: "코오롱스포츠", variants: ["코오롱스포츠", "kolon sport"] },
  { name: "컬럼비아", variants: ["columbia", "컬럼비아"] },
  { name: "디스커버리", variants: ["discovery expedition", "디스커버리익스페디션", "discovery", "디스커버리"] },
  { name: "아이더", variants: ["eider", "아이더"] },
  { name: "네파", variants: ["nepa", "네파"] },
  { name: "라푸마", variants: ["lafuma", "라푸마"] },
  { name: "몽벨", variants: ["montbell", "몽벨"] },
  { name: "프로스펙스", variants: ["prospecs", "프로스펙스"] },
  { name: "유니클로", variants: ["uniqlo", "유니클로"] },
  { name: "스파오", variants: ["spao", "스파오"] },
  // 가전/디지털
  { name: "다이슨", variants: ["dyson", "다이슨"] },
  { name: "필립스", variants: ["philips", "필립스"] },
  { name: "샤오미", variants: ["xiaomi", "샤오미"] },
  { name: "브라운", variants: ["braun", "브라운"] },
  { name: "삼성", variants: ["samsung", "삼성전자", "삼성"] },
  { name: "LG", variants: ["lg전자", "엘지전자"] },
  { name: "애플", variants: ["apple", "애플"] },
  // 식품
  { name: "오리온", variants: ["orion", "오리온"] },
  { name: "해태", variants: ["해태"] },
  { name: "농심", variants: ["농심"] },
  { name: "오뚜기", variants: ["오뚜기"] },
  { name: "빙그레", variants: ["빙그레"] },
  { name: "던킨", variants: ["dunkin", "던킨"] },
  { name: "미주라", variants: ["misura", "미주라"] },
  { name: "하겐다즈", variants: ["haagen", "하겐다즈"] },
  { name: "배스킨라빈스", variants: ["baskin", "배스킨라빈스", "베스킨라빈스"] },
];

/**
 * 상품명에서 브랜드를 안정적으로 추출·정규화한다. 확실한 사전 일치만 반환하고,
 *   불확실하면 null(추측하지 않음). 카드에서 쇼핑몰명과 별개로 표시하는 용도.
 */
export function brandFrom(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  for (const b of BRAND_DICT) {
    for (const v of b.variants) {
      if (lower.includes(v.toLowerCase())) return b.name;
    }
  }
  return null;
}
