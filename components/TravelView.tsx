import Link from "next/link";
import FlightsView from "./FlightsView";
import StayDestinations from "./StayDestinations";
import Script from "next/script";

export type TravelTab = "flight" | "stay" | "deal";

// 여행 예약처로 이동하는 제휴 링크. 가격 이력으로 검증한 딜과 구분한다.
const LP_AID = "A100707159";
function lp(mid: string, target: string): string {
  return `https://click.linkprice.com/click.php?m=${mid}&a=${LP_AID}&l=9999&tu=${encodeURIComponent(
    target
  )}`;
}

type Partner = { icon: string; name: string; desc: string; href: string };

const STAY_PARTNERS: Partner[] = [
  { icon: "🔎", name: "호텔스컴바인", desc: "전세계 호텔 최저가 비교", href: lp("hcombine2", "https://www.hotelscombined.co.kr") },
  { icon: "🏨", name: "아고다", desc: "해외 호텔·리조트", href: lp("agoda", "https://www.agoda.com/ko-kr") },
  { icon: "🛏️", name: "야놀자 NOL", desc: "국내 호텔·펜션·모텔", href: lp("yanolja", "https://nol.yanolja.com/") },
];

// 목적지별 액티비티/투어 — 대표 검색 경로만 제공.
const klook = (q: string) =>
  lp("klook", `https://www.klook.com/ko/search/?query=${encodeURIComponent(q)}`);

const DEAL_PARTNERS: Partner[] = [
  { icon: "🗼", name: "도쿄 투어·티켓", desc: "디즈니·인기 액티비티", href: klook("도쿄") },
  { icon: "🏯", name: "오사카·교토", desc: "유니버설·간사이", href: klook("오사카") },
  { icon: "🏖️", name: "다낭·베트남", desc: "바나힐·호이안", href: klook("다낭") },
  { icon: "🍊", name: "제주·국내", desc: "국내 액티비티·입장권", href: klook("제주") },
];

const SERVICE_PARTNERS: Partner[] = [
  { icon: "📶", name: "에어알로 eSIM", desc: "해외 데이터 eSIM", href: lp("airalo", "https://www.airalo.com/ko") },
  { icon: "🧭", name: "마이리얼트립", desc: "한국인 가이드 투어", href: lp("myrealtrip", "https://www.myrealtrip.com/") },
  { icon: "🎟️", name: "KKday", desc: "현지 투어·티켓", href: lp("kkday", "https://www.kkday.com/ko") },
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

function TravelNote({ kind }: { kind: "stay" | "deal" }) {
  const stay = kind === "stay";
  return (
    <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-600">
      <p>{stay
        ? "같은 날짜·인원·객실·취소 조건에서 세금과 추가요금을 포함한 최종 금액을 비교하세요."
        : "입장 날짜와 포함 항목, 환불 조건을 확인하세요. 투어·티켓은 가격 이력으로 할인 여부를 판정하지 않습니다."}</p>
      <Link href={stay ? "/guides/travel-stay" : "/guides/travel-activities"} className="mt-2 inline-block font-bold text-brand hover:underline">
        {stay ? "숙소 비교 가이드" : "여행딜 비교 가이드"} →
      </Link>
    </section>
  );
}

function PartnerSection({ partners, heading }: { partners: Partner[]; heading: string }) {
  return (
    <section className="mt-6">
      <SectionTitle>{heading}</SectionTitle>
      <PartnerGrid partners={partners} />
    </section>
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
      <Script src="https://tp-em.com/NTY2NTY1.js?t=566565" strategy="afterInteractive" data-cmp-ab="2" />
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
      <p className="mb-4 text-xs leading-5 text-gray-500">
        여행 요금은 쇼핑 상품의 가격 이력·DROP SCORE 판정 대상이 아닙니다.
        항공권은 최근 조회 요금이며, 숙소·여행딜은 외부 예약처에서 조건과 최종 가격을 확인해 주세요.
      </p>

      {tab === "flight" && (
        <FlightsView region={region} origin={origin} destination={destination} />
      )}
      {tab === "stay" && (
        <div>
          <SectionTitle>🏨 지역별 숙소 검색</SectionTitle>
          <StayDestinations region={region} />
          <PartnerSection partners={STAY_PARTNERS} heading="🔎 예약처에서 조건별 총액 확인" />
          <TravelNote kind="stay" />
        </div>
      )}
      {tab === "deal" && (
        <div>
          <PartnerSection partners={DEAL_PARTNERS} heading="🎢 지역별 액티비티 검색" />
          <PartnerSection partners={SERVICE_PARTNERS} heading="🧳 여행 준비 예약처" />
          <TravelNote kind="deal" />
        </div>
      )}
    </div>
  );
}
