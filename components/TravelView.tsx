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

const STAY_NOTES = [
  { region: "국내", check: "주말·공휴일과 평일 요금, 주차·조식 포함 여부", caution: "취소 수수료 적용 시각과 현장 추가요금" },
  { region: "일본", check: "역까지 이동 시간, 객실 면적, 1인·2인 요금 차이", caution: "도시별 숙박세와 체크인 시간" },
  { region: "동남아", check: "우기·성수기, 공항 이동비, 세금 포함 총액", caution: "리조트 요금과 무료 취소 가능 기한" },
  { region: "중화권", check: "교통 접근성, 현지 세금, 객실 인원 기준", caution: "예약 통화와 현장 결제 조건" },
  { region: "유럽", check: "도시세, 조식·수하물 보관, 교통권 비용", caution: "환율 변동과 체크인 전 취소 조건" },
  { region: "미주·기타", check: "리조트피·세금, 주차비, 이동 거리", caution: "현장 보증금과 결제 통화" },
];

function StayAdvice({ region }: { region?: string }) {
  const notes = region ? STAY_NOTES.filter((item) => item.region === region) : STAY_NOTES;
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm leading-7 text-gray-700">
      <h2 className="text-base font-extrabold text-gray-900">숙소를 비교할 때 보는 기준</h2>
      <p className="mt-2">
        Dropped는 숙소의 지역별 실측 가격대를 아직 수집하지 않습니다. 아래는 요금 순위가
        아닌 비교 체크리스트입니다. 같은 날짜·인원·객실·취소 조건에서 세금과 추가비용을
        포함한 총액을 비교하세요. 기준일: 2026년 9월 14일.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {notes.map((item) => (
          <div key={item.region} className="rounded-lg bg-gray-50 p-3">
            <h3 className="font-bold text-gray-900">{item.region}</h3>
            <p>비교: {item.check}</p>
            <p>주의: {item.caution}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-gray-600">
        예약처를 바꿔 볼 때도 객실 타입과 결제·취소 조건을 같게 맞춰야 가격 차이를
        비교할 수 있습니다. 예약 페이지의 최종 금액이 이 화면의 어떤 안내보다 우선합니다.
      </p>
    </section>
  );
}

function ActivityAdvice() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 text-sm leading-7 text-gray-700">
      <h2 className="text-base font-extrabold text-gray-900">여행딜 비교 기준</h2>
      <p className="mt-2">
        액티비티는 상품명보다 포함 범위가 중요합니다. 입장권만 제공하는지, 교통편·가이드·식사가
        포함되는지 먼저 확인하세요. 같은 장소라도 날짜, 이용 시간, 연령, 환불 가능 여부에 따라
        가격이 달라집니다. Dropped는 투어·티켓 가격 이력을 아직 수집하지 않아 아래 링크를
        ‘평소보다 싼 딜’로 판정하지 않습니다. 기준일: 2026년 9월 14일.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-3"><h3 className="font-bold">일본·홍콩 테마파크</h3><p>입장 날짜, 시간 지정, 익스프레스권 포함 여부를 비교하세요.</p></div>
        <div className="rounded-lg bg-gray-50 p-3"><h3 className="font-bold">동남아 투어</h3><p>픽업 범위, 우천 취소, 현장 추가비용을 확인하세요.</p></div>
        <div className="rounded-lg bg-gray-50 p-3"><h3 className="font-bold">도시 관광패스</h3><p>유효 기간과 실제 방문할 시설 수로 손익을 계산하세요.</p></div>
      </div>
      <p className="mt-3 text-gray-600">
        해외 예약은 결제 통화와 환율·수수료도 달라질 수 있습니다. 쇼핑 상품의 가격 이력을
        읽는 방법은 <Link href="/guides/cross-border-cost" className="font-bold text-brand hover:underline">해외 결제 비교 가이드</Link>를 참고하세요.
      </p>
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
          <StayAdvice region={region} />
          <SectionTitle>🏨 지역별 숙소 검색</SectionTitle>
          <StayDestinations region={region} />
          <PartnerSection partners={STAY_PARTNERS} heading="🔎 예약처에서 조건별 총액 확인" />
        </div>
      )}
      {tab === "deal" && (
        <div>
          <ActivityAdvice />
          <PartnerSection partners={DEAL_PARTNERS} heading="🎢 지역별 액티비티 검색" />
          <PartnerSection partners={SERVICE_PARTNERS} heading="🧳 여행 준비 예약처" />
        </div>
      )}
    </div>
  );
}
