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

const STAY_PARTNERS: Partner[] = [
  { icon: "🏨", name: "아고다", desc: "전세계 호텔 최저가", href: lp("agoda", "https://www.agoda.com/ko-kr") },
  { icon: "🛏️", name: "야놀자 NOL", desc: "국내 호텔·펜션·모텔", href: lp("yanolja", "https://nol.yanolja.com/") },
  { icon: "🔎", name: "호텔스컴바인", desc: "호텔 가격 비교", href: lp("hcombine2", "https://www.hotelscombined.co.kr") },
  { icon: "🗾", name: "라쿠텐 트래블", desc: "일본 숙소 전문", href: lp("rakutentr", "https://travel.rakuten.com") },
];

// 목적지별 액티비티/투어 — 클룩 검색으로 딥링크(홈 말고 해당 여행지 결과로)
const klook = (q: string) =>
  lp("klook", `https://www.klook.com/ko/search/?query=${encodeURIComponent(q)}`);

const DEAL_PARTNERS: Partner[] = [
  { icon: "🗼", name: "도쿄 투어·티켓", desc: "디즈니·인기 액티비티", href: klook("도쿄") },
  { icon: "🏯", name: "오사카·교토", desc: "유니버설·간사이", href: klook("오사카") },
  { icon: "🏖️", name: "다낭·베트남", desc: "바나힐·호이안", href: klook("다낭") },
  { icon: "🛕", name: "방콕·태국", desc: "사원·쇼·투어", href: klook("방콕") },
  { icon: "🦁", name: "싱가포르", desc: "유니버설·가든스", href: klook("싱가포르") },
  { icon: "🎡", name: "홍콩·마카오", desc: "디즈니·오션파크", href: klook("홍콩") },
  { icon: "🏮", name: "대만", desc: "타이베이·지우펀", href: klook("타이베이") },
  { icon: "🍊", name: "제주·국내", desc: "국내 액티비티·입장권", href: klook("제주") },
];

function PartnerGrid({ partners, note }: { partners: Partner[]; note: string }) {
  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">{note}</p>
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
      <p className="mt-4 text-[11px] text-gray-400">
        제휴 링크입니다. 예약 시 판매 페이지에서 최종 가격을 확인하세요. 곧
        개별 특가도 카드로 모아 보여드릴게요.
      </p>
    </div>
  );
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
        <PartnerGrid
          partners={STAY_PARTNERS}
          note="🏨 국내외 숙소 예약 — 아래에서 바로 최저가 검색하세요."
        />
      )}
      {tab === "deal" && (
        <PartnerGrid
          partners={DEAL_PARTNERS}
          note="🎢 여행지별 투어·입장권·액티비티(클룩) — 목적지를 누르면 인기 액티비티가 떠요."
        />
      )}
    </div>
  );
}
