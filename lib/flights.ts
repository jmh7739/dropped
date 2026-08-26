import { supabase } from "./supabase";
import { FlightDeal } from "./types";

export type FlightScope = "all" | "domestic" | "intl";

// 지역 표시 순서(국내 먼저, 가까운 순)
export const REGION_ORDER = [
  "국내",
  "일본",
  "중화권",
  "동남아",
  "오세아니아",
  "중동",
  "유럽",
  "미주",
];

// Windows는 국기 이모지(🇰🇷 등)를 KR/JP 같은 코드로 표시 → 국기 대신 범용 이모지 사용
const REGION_EMOJI: Record<string, string> = {
  국내: "🏠",
  일본: "🗾",
  중화권: "🏮",
  동남아: "🌴",
  오세아니아: "🦘",
  중동: "🕌",
  유럽: "🏰",
  미주: "🗽",
};

export function regionEmoji(region: string): string {
  return REGION_EMOJI[region] ?? "✈️";
}

// 도착지(한글명) → 지역. 크롤러 DEST와 동일 기준. DB 컬럼 없이 프론트에서 분류.
const DEST_REGION: Record<string, string> = {
  김포: "국내", 서울: "국내", 인천: "국내", 제주: "국내", 부산: "국내",
  대구: "국내", 광주: "국내", 울산: "국내", 여수: "국내", 청주: "국내", 양양: "국내",
  도쿄: "일본", 오사카: "일본", 후쿠오카: "일본", 삿포로: "일본", 오키나와: "일본",
  나고야: "일본", 가고시마: "일본", 구마모토: "일본", 히로시마: "일본", 고마쓰: "일본",
  다카마쓰: "일본", 오이타: "일본",
  타이베이: "중화권", 가오슝: "중화권", 홍콩: "중화권", 마카오: "중화권",
  베이징: "중화권", 상하이: "중화권", 광저우: "중화권", 칭다오: "중화권",
  선전: "중화권", 샤먼: "중화권",
  방콕: "동남아", 다낭: "동남아", 호치민: "동남아", 하노이: "동남아", 나트랑: "동남아",
  푸꾸옥: "동남아", 세부: "동남아", 마닐라: "동남아", 싱가포르: "동남아",
  쿠알라룸푸르: "동남아", 발리: "동남아", 코타키나발루: "동남아", 씨엠립: "동남아",
  프놈펜: "동남아", 비엔티안: "동남아",
  파리: "유럽", 런던: "유럽", 프랑크푸르트: "유럽", 뮌헨: "유럽", 로마: "유럽",
  밀라노: "유럽", 바르셀로나: "유럽", 마드리드: "유럽", 암스테르담: "유럽",
  취리히: "유럽", 빈: "유럽", 프라하: "유럽", 이스탄불: "유럽", 리스본: "유럽",
  로스앤젤레스: "미주", 뉴욕: "미주", 샌프란시스코: "미주", 시애틀: "미주",
  호놀룰루: "미주", 라스베이거스: "미주", 시카고: "미주", 밴쿠버: "미주",
  토론토: "미주", 괌: "미주", 사이판: "미주",
  시드니: "오세아니아", 멜버른: "오세아니아", 브리즈번: "오세아니아", 오클랜드: "오세아니아",
  두바이: "중동", 도하: "중동", 아부다비: "중동",
};

function regionOf(f: { destination: string; region: string | null; isDomestic: boolean }): string {
  return f.region || DEST_REGION[f.destination] || (f.isDomestic ? "국내" : "기타");
}

export interface FlightRegionSummary {
  region: string;
  minPrice: number | null;
  routeCount: number;
}

export interface FlightRouteSummary {
  origin: string;
  destination: string;
  region: string;
  isDomestic: boolean;
  minPrice: number | null;
  dateCount: number;
}

function rowToDeal(r: any): FlightDeal {
  return {
    id: r.id,
    source: r.source,
    origin: r.origin,
    destination: r.destination,
    region: r.region ?? null,
    departDate: r.depart_date,
    returnDate: r.return_date,
    airline: r.airline,
    price: r.price,
    isDomestic: r.is_domestic,
    dealUrl: r.deal_url,
    postedAt: r.posted_at,
  };
}

async function allDeals(): Promise<FlightDeal[]> {
  if (!supabase) return [];
  // 출발일이 지난(과거) 항공권은 제외 — 오늘 이후만
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("flight_deals")
    .select("*")
    .gte("depart_date", today)
    .order("price", { ascending: true });
  if (error || !data) return [];
  return data.map(rowToDeal);
}

/** 1단계: 지역별 요약(최저가·노선 수). */
export async function getFlightRegions(): Promise<FlightRegionSummary[]> {
  const deals = await allDeals();
  const byRegion = new Map<string, { min: number; routes: Set<string> }>();
  for (const f of deals) {
    const region = regionOf(f);
    const cur = byRegion.get(region) ?? { min: Infinity, routes: new Set() };
    if (f.price != null) cur.min = Math.min(cur.min, f.price);
    cur.routes.add(`${f.origin}-${f.destination}`);
    byRegion.set(region, cur);
  }
  const out = [...byRegion.entries()].map(([region, v]) => ({
    region,
    minPrice: Number.isFinite(v.min) ? v.min : null,
    routeCount: v.routes.size,
  }));
  out.sort((a, b) => {
    const ia = REGION_ORDER.indexOf(a.region);
    const ib = REGION_ORDER.indexOf(b.region);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return out;
}

/** 2단계: 특정 지역의 노선별 요약(최저가·날짜 수). */
export async function getFlightRoutes(
  region: string
): Promise<FlightRouteSummary[]> {
  const deals = await allDeals();
  const byRoute = new Map<string, FlightRouteSummary>();
  for (const f of deals) {
    const r = regionOf(f);
    if (r !== region) continue;
    const key = `${f.origin}-${f.destination}`;
    const cur = byRoute.get(key);
    if (!cur) {
      byRoute.set(key, {
        origin: f.origin,
        destination: f.destination,
        region: r,
        isDomestic: f.isDomestic,
        minPrice: f.price,
        dateCount: 1,
      });
    } else {
      cur.dateCount += 1;
      if (f.price != null && (cur.minPrice == null || f.price < cur.minPrice))
        cur.minPrice = f.price;
    }
  }
  return [...byRoute.values()].sort(
    (a, b) => (a.minPrice ?? 1e12) - (b.minPrice ?? 1e12)
  );
}

/** 3단계: 특정 노선의 날짜별 목록(가격 낮은 순). */
export async function getFlightRouteDeals(
  origin: string,
  destination: string
): Promise<FlightDeal[]> {
  const deals = await allDeals();
  return deals
    .filter((f) => f.origin === origin && f.destination === destination)
    .sort((a, b) => (a.price ?? 1e12) - (b.price ?? 1e12));
}
