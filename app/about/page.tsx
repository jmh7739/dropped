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
        <h2 className="text-lg font-bold">어떻게 작동하나요?</h2>
        <ul className="mt-3 space-y-2 text-gray-700">
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand">•</span>
            <span>
              매시간 주요 쇼핑몰(쿠팡, 알리익스프레스, 국내 온라인몰)의 가격을
              자동으로 수집합니다.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand">•</span>
            <span>
              90일간의 실제 판매 가격 이력을 기반으로, 지금 가격이 평소 대비
              얼마나 떨어졌는지 계산합니다.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand">•</span>
            <span>
              판매자가 표시한 &ldquo;할인율&rdquo;이 아닌, 실제 가격 변동
              데이터를 기준으로 진짜 특가만 선별합니다.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">주요 기능</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: "📊",
              title: "DROP SCORE",
              desc: "할인폭, 플랫폼 신뢰도, 인기도, 역대 최저 여부를 종합한 점수",
            },
            {
              icon: "📉",
              title: "가격 그래프",
              desc: "7일/30일/90일/전체 기간의 실제 가격 변동 시각화",
            },
            {
              icon: "✅",
              title: "구매 판정",
              desc: "🟢 사도 좋은 가격 / 🟡 괜찮은 가격 / 🔴 기다리기",
            },
            {
              icon: "✈️",
              title: "여행 특가",
              desc: "항공권·숙소 최저가 비교",
            },
            {
              icon: "⚖️",
              title: "경매 특가",
              desc: "법원경매 부동산·자동차의 감정가 대비 하락률",
            },
            {
              icon: "🛒",
              title: "베스트딜",
              desc: "국내 온라인몰에서 지금 잘 팔리는 인기 할인 상품",
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
          가격 데이터와 추천은 제휴 관계에 영향받지 않으며, 실제 가격 이력
          데이터만을 기준으로 합니다.
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
        <Link
          href="/"
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-bold text-gray-700 hover:bg-gray-50"
        >
          ← 급락딜 보러가기
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
