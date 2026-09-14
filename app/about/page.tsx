import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "사이트 소개",
  description:
    "떨어졌다는 실제 가격 이력을 기반으로 진짜 할인인지 판별해주는 가격 추적 서비스입니다.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold">
        떨어졌다 — 이 가격이 정말 떨어진 가격인가?
      </h1>

      <section className="mt-6 space-y-4 leading-7 text-gray-700">
        <p>
          온라인 쇼핑에서 &ldquo;할인&rdquo;이라고 표시된 가격이 정말로 평소보다
          싼지 알기 어렵습니다. 정가를 부풀려 놓고 할인하는 것처럼 보이게 하거나,
          늘 &ldquo;세일&rdquo; 중인 상품도 있습니다.
        </p>
        <p>
          <strong>떨어졌다</strong>는 이 문제를 데이터로 해결합니다. 판매자가
          표시한 할인율 대신, 실제 가격 이력을 기반으로 지금이 정말 싼 가격인지
          판별해 드립니다.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">가격 판정은 언제 믿을 수 있나요?</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
          {[
            ["🔵 7일 미만", "신규 추적"],
            ["🟡 7~29일", "가격 데이터 축적 중"],
            ["🟢 30~89일", "30일 가격판정 가능"],
            ["🏆 90일 이상", "90일 최저·평균 판정 가능"],
          ].map(([period, meaning]) => (
            <div key={period} className="grid grid-cols-2 border-b border-gray-100 px-4 py-2.5 last:border-0">
              <strong>{period}</strong><span className="text-gray-600">{meaning}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          90일 이력이 없으면 “90일 최저가”라고 표시하지 않고, 실제 추적 기간을 함께 밝힙니다.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">어떻게 작동하나요?</h2>
        <ul className="mt-3 space-y-2 text-gray-700">
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand">•</span>
            <span>
              쿠팡·알리익스프레스·국내 온라인몰 등에서 확인한 가격을
              주기적으로 기록합니다. 상품별 수집 간격은 다를 수 있습니다.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand">•</span>
            <span>
              실제 판매 가격 이력을 기반으로, 지금 가격이 평소 대비
              얼마나 떨어졌는지 계산합니다.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand">•</span>
            <span>
              가격 이력이 충분한 상품은 평균 가격과 추적 최저가를 비교합니다.
              이력이 부족한 할인 상품은 별도로 표시하며 구매 판정을 단정하지 않습니다.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-4 text-sm leading-7 text-gray-700">
        <h2 className="text-lg font-bold text-gray-900">수집·검증·품질관리</h2>
        <p>
          쇼핑 가격 수집 작업은 현재 매시간 실행되도록 설정되어 있습니다. 외부 판매처의
          응답이나 작업 지연 때문에 모든 상품을 정확히 한 시간 간격으로 확인한다는 뜻은
          아닙니다. 상품 상세의 ‘최근 확인’ 시간과 가격 수집 횟수가 실제 관측 범위입니다.
        </p>
        <p>
          수집 단계에서 0원 이하 가격, 품절로 표시된 상품, 쿠폰·카드·회원 전용가,
          옵션의 최저가만 제시된 항목, 기존 기록의 중앙값과 지나치게 벌어진 가격은
          일반 가격 이력에 넣지 않도록 보류합니다. 조건이나 배송비가 확인되지 않은
          항목은 경고 대상으로 다루지만 원천 정보가 불완전할 수 있으므로 판매 페이지에서
          옵션과 최종 결제액을 다시 확인해야 합니다.
        </p>
        <p>
          급락 후보는 판매자 정가가 아니라 수집한 실제 가격의 중앙값과 현재가를 비교하고,
          가격 변동이 지나치게 크거나 저가가 반복되는 경우도 따로 점검합니다. 상세의
          구매 판정은 추적 7일 이상과 유효 기록 10회 이상일 때에만 충분한 이력으로
          취급합니다. ‘검증된 핫딜’은 이보다 긴 추적 기간과 점수·하락률 기준을
          추가로 적용합니다.
        </p>
        <p>
          DROP SCORE는 평균 대비 하락폭, 추적 최저 여부, 추적 기간, 마지막 확인 시점,
          판매처와 이용자 관심도를 함께 반영한 상대 지표입니다. 점수가 높아도 배송비나
          쿠폰 조건까지 보증하지는 않습니다. 판정 방식은 바뀔 수 있으므로 숫자 하나보다
          가격 그래프와 수집 범위를 함께 보는 것이 좋습니다.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">주요 기능</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: "📊",
              title: "DROP SCORE",
              desc: "할인폭, 플랫폼 신뢰도, 인기도, 추적 최저 여부를 종합한 점수",
            },
            {
              icon: "📉",
              title: "가격 그래프",
              desc: "추적 기간별 실제 가격 변동 시각화",
            },
            {
              icon: "✅",
              title: "구매 판정",
              desc: "🔥 매우 좋은 가격 / 🟢 좋은 가격 / 🟡 보통 가격 / 🔴 기다리기",
            },
            {
              icon: "✈️",
              title: "여행 탐색",
              desc: "최근 조회된 항공권 요금과 예약처 비교 (상품 가격판정과 별개)",
            },
            {
              icon: "🛒",
              title: "핫딜",
              desc: "국내·해외 상품을 좋은 이유 배지와 함께 한곳에서 비교",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{f.icon}</span>
                <h3 className="font-bold text-gray-900">{f.title}</h3>
              </div>
              <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">제휴 안내</h2>
        <p className="mt-2 leading-7 text-gray-700">
          이 사이트의 일부 링크는 제휴 마케팅 링크입니다. 링크를 통해
          구매하시면 사이트 운영에 도움이 되는 소정의 수수료를 받을 수 있습니다.
          가격 그래프와 평균·최저가는 수집된 가격 이력으로 계산합니다. DROP SCORE에는
          가격 하락폭 외에도 추적 기간, 판매처, 관심도 등이 반영됩니다. 제휴 링크가
          있는 상품도 있으며, 가격 이력이 부족한 할인 상품은 검증 딜과 구분합니다.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">연락처</h2>
        <div className="mt-2 space-y-1 text-gray-700">
          <p>
            이메일:{" "}
            <a
              href="mailto:aimarket7329@gmail.com"
              className="text-brand hover:underline"
            >
              aimarket7329@gmail.com
            </a>
          </p>
          <p>운영: AI MARKET</p>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3 text-sm">
        <Link href="/guides" className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-bold text-brand hover:bg-gray-50">가격 비교 가이드 →</Link>
        <Link
          href="/"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50"
        >
          ← 핫딜 보러가기
        </Link>
        <Link
          href="/privacy"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-500 hover:bg-gray-50"
        >
          개인정보처리방침
        </Link>
        <Link
          href="/terms"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-500 hover:bg-gray-50"
        >
          이용안내·면책
        </Link>
      </div>
    </article>
  );
}
