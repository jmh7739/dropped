// 숙소 딥링크 — Hotellook(2025.10 폐쇄) 대체.
//   호텔스컴바인 '도시 페이지'(/Place/<Slug>.htm)는 그 도시의 여러 예약사이트 요금을
//   한 번에 비교해 보여준다. 링크프라이스 딥링크(우리 제휴ID)로 감싸 예약 시 커미션.
//   ※ 아고다·트립닷컴·익스피디아는 LP 딥링크가 도시경로를 버려서(홈으로 감) 제외.
//     호텔스컴바인만 도시 경로가 보존됨(실측 확인). 모든 slug은 200 응답 검증됨.
export const LP_AID = "A100707159";

export function lp(mid: string, target: string): string {
  return `https://click.linkprice.com/click.php?m=${mid}&a=${LP_AID}&l=9999&tu=${encodeURIComponent(
    target
  )}`;
}

type City = { name: string; emoji: string; slug: string };

// 지역별 인기 목적지. slug = 호텔스컴바인 /Place/<slug>.htm (실제 200 검증).
export const STAY_REGIONS: { region: string; cities: City[] }[] = [
  {
    region: "일본",
    cities: [
      { name: "도쿄", emoji: "🗼", slug: "Tokyo" },
      { name: "오사카", emoji: "🏯", slug: "Osaka" },
      { name: "후쿠오카", emoji: "🍜", slug: "Fukuoka" },
      { name: "삿포로", emoji: "❄️", slug: "Sapporo" },
      { name: "오키나와", emoji: "🏝️", slug: "Okinawa" },
      { name: "나고야", emoji: "🏙️", slug: "Nagoya" },
    ],
  },
  {
    region: "동남아",
    cities: [
      { name: "방콕", emoji: "🛕", slug: "Bangkok" },
      { name: "푸켓", emoji: "🏝️", slug: "Phuket" },
      { name: "하노이", emoji: "🏙️", slug: "Hanoi" },
      { name: "세부", emoji: "🐠", slug: "Cebu" },
      { name: "싱가포르", emoji: "🦁", slug: "Singapore" },
      { name: "발리", emoji: "🌺", slug: "Bali" },
    ],
  },
  {
    region: "중화권",
    cities: [
      { name: "타이베이", emoji: "🏮", slug: "Taipei" },
      { name: "가오슝", emoji: "🌆", slug: "Kaohsiung" },
      { name: "홍콩", emoji: "🌃", slug: "Kowloon" },
      { name: "마카오", emoji: "🎰", slug: "Macau" },
    ],
  },
  {
    region: "국내",
    cities: [
      { name: "제주", emoji: "🍊", slug: "Jeju" },
      { name: "서울", emoji: "🏙️", slug: "Seoul" },
    ],
  },
  {
    region: "유럽",
    cities: [
      { name: "파리", emoji: "🥐", slug: "Paris" },
      { name: "로마", emoji: "🏛️", slug: "Rome" },
      { name: "바르셀로나", emoji: "⛪", slug: "Barcelona" },
      { name: "런던", emoji: "🎡", slug: "London" },
    ],
  },
  {
    region: "미주·기타",
    cities: [
      { name: "괌", emoji: "🏝️", slug: "Guam" },
      { name: "사이판", emoji: "🏖️", slug: "Saipan" },
    ],
  },
];

function stayLink(slug: string): string {
  return lp("hcombine2", `https://www.hotelscombined.co.kr/Place/${slug}.htm`);
}

// 목적지 한글명 → 숙소 딥링크 (항공권 카드 크로스셀·숙소 카드 공용)
const SLUG_BY_NAME: Record<string, string> = Object.fromEntries(
  STAY_REGIONS.flatMap((r) => r.cities.map((c) => [c.name, c.slug]))
);

/** 그 도시 숙소 비교 딥링크. 지원 안 하는 목적지면 null. */
export function stayUrl(destKo: string): string | null {
  const slug = SLUG_BY_NAME[destKo];
  return slug ? stayLink(slug) : null;
}

/** 카드용: 지역별 도시 + 딥링크 */
export function stayRegionsWithUrls() {
  return STAY_REGIONS.map((r) => ({
    region: r.region,
    cities: r.cities.map((c) => ({ ...c, href: stayLink(c.slug) })),
  }));
}
