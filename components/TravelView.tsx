import Link from "next/link";
import FlightsView from "./FlightsView";

export type TravelTab = "flight" | "stay" | "deal";

// 링크프라이스 딥링크 (우리 제휴ID 박힘 → 예약 시 수수료). 모두 승인·deeplink 가능 몰.
const LP_AID = "A100707159";
function lp(mid: string, target: string): string {
  return `https://click.linkprice.com/click.php?m=${mid}&a=${LP_AID}&l=9999&tu=${encodeURIComponent(
    target
  )}`;
}

type Partner = { icon: string; name: string; desc: string; href: string };

// 겹치는 몰은 커미션 높은 순으로 배치 (호텔스컴바인 28% > 아고다 4.9% > 호텔스닷컴 4.4%)
const STAY_PARTNERS: Partner[] = [
  { icon: "🔎", name: "호텔스컴바인", desc: "전세계 호텔 최저가 비교", href: lp("hcombine2", "https://www.hotelscombined.co.kr") },
  { icon: "🏨", name: "아고다", desc: "해외 호텔·리조트", href: lp("agoda", "https://www.agoda.com/ko-kr") },
  { icon: "🛎️", name: "호텔스닷컴", desc: "호텔 예약·10박 1박 무료", href: lp("hotelskr", "https://kr.hotels.com/") },
  { icon: "🛏️", name: "야놀자 NOL", desc: "국내 호텔·펜션·모텔", href: lp("yanolja", "https://nol.yanolja.com/") },
];

// 목적지별 액티비티/투어 — 마이리얼트립(5.25%, 클룩 3.5%보다 높음) 검색 딥링크
const mrt = (city: string) =>
  lp("myrealtrip", `https://www.myrealtrip.com/search?q=${encodeURIComponent(city)}`);

const DEAL_PARTNERS: Partner[] = [
  { icon: "🗼", name: "도쿄 투어·티켓", desc: "디즈니·인기 액티비티", href: mrt("도쿄") },
  { icon: "🏯", name: "오사카·교토", desc: "유니버설·간사이", href: mrt("오사카") },
  { icon: "🏖️", name: "다낭·베트남", desc: "바나힐·호이안", href: mrt("다낭") },
  { icon: "🛕", name: "방콕·태국", desc: "사원·쇼·투어", href: mrt("방콕") },
  { icon: "🦁", name: "싱가포르", desc: "유니버설·가든스", href: mrt("싱가포르") },
  { icon: "🎡", name: "홍콩·마카오", desc: "디즈니·오션파크", href: mrt("홍콩") },
  { icon: "🏮", name: "대만", desc: "타이베이·지우펀", href: mrt("대만") },
  { icon: "🍊", name: "제주·국내", desc: "국내 액티비티·입장권", href: mrt("제주") },
];

// 더 많은 여행 준비 — 겹치지 않는 것 + 커미션 높은 것 (Airalo 10.5%). KKday(2.1%)는 마리트와 겹쳐 제외
const SERVICE_PARTNERS: Partner[] = [
  { icon: "📶", name: "에어알로 eSIM", desc: "해외 데이터 eSIM", href: lp("airalo", "https://www.airalo.com/ko") },
  { icon: "🏷️", name: "땡처리닷컴", desc: "여행 막판 땡처리 특가", href: lp("072com", "http://www.ttang.com") },
  { icon: "🎫", name: "Go City", desc: "도시 관광패스", href: lp("gocity", "https://gocity.com/ko") },
  { icon: "🚄", name: "레일유럽", desc: "유럽 기차 패스·티켓", href: lp("re4akor", "http://www.raileurope.co.kr") },
];

function PartnerGrid({ partners }: { partners: Partner[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {partners.map((p) => (
        <a
          key={p.name}
          href={p.href}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand/40 hover:shadow-md"
        >
          <span className="text-2xl">{p.icon}</span>
          <span className="text-sm font-extrabold text-gray-900">{p.name}</span>
          <span className="text-[11px] text-gray-400">{p.desc}</span>
          <span className="mt-1 text-xs font-bold text-brand">보러가기 →</span>
        </a>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-6 text-sm font-bold text-gray-700 first:mt-0">{children}</p>;
}


const TABS: { key: TravelTab; label: string }[] = [
  { key: "flight", label: "✈️ 항공권" },
  { key: "stay", label: "🏨 숙소" },
  { key: "deal", label: "🎢 여행딜" },
];

export default function TravelView({
  tab,
  region,
  origin,
  destination,
}: {
  tab: TravelTab;
  region?: string;
  origin?: string;
  destination?: string;
}) {
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "flight" ? "/?category=flight" : `/?category=flight&tt=${t.key}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? "bg-brand text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "flight" && (
        <FlightsView region={region} origin={origin} destination={destination} />
      )}
      {tab === "stay" && (
        <div>
          <SectionTitle>🏨 국내외 숙소 예약</SectionTitle>
          <PartnerGrid partners={STAY_PARTNERS} />
        </div>
      )}
      {tab === "deal" && (
        <div>
          <SectionTitle>🎢 여행지별 액티비티·투어</SectionTitle>
          <PartnerGrid partners={DEAL_PARTNERS} />
          <SectionTitle>🧳 더 많은 여행 준비</SectionTitle>
          <PartnerGrid partners={SERVICE_PARTNERS} />
        </div>
      )}
    </div>
  );
}
