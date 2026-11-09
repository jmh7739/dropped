import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import DealGrid from "@/components/DealGrid";
import { getCuratedDeals, getDeals } from "@/lib/deals";
import type { Deal } from "@/lib/types";
import { SITE_URL } from "@/lib/site";

const PATH = "/events/1111";
const LIMIT = 24;

const is11st = (deal: Deal) => /^(11st|11번가)$/i.test((deal.mallName ?? "").trim());
const isAli = (deal: Deal) => deal.platform === "aliexpress";

async function loadSaleDeals() {
  const [tracked, curated] = await Promise.all([
    getDeals({ sort: "discount" }).catch(() => [] as Deal[]),
    getCuratedDeals("discount").catch(() => [] as Deal[]),
  ]);
  const seen = new Set<number>();
  const all = [...tracked, ...curated].filter((deal) => deal.status !== "ended" && !seen.has(deal.id) && seen.add(deal.id));
  return {
    elevenst: all.filter(is11st).slice(0, LIMIT),
    ali: all.filter(isAli).slice(0, LIMIT),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { elevenst, ali } = await loadSaleDeals();
  return {
    title: "11월 11일 쇼핑 행사 가격 확인 — 11번가·알리익스프레스",
    description: "11월 11일 전후 쇼핑 행사에서 11번가와 알리익스프레스 상품을 살 때 가격 이력, 쿠폰 조건, 배송·환불을 확인하는 순서와 현재 수집 중인 특가 상품입니다.",
    alternates: { canonical: `${SITE_URL}${PATH}` },
    robots: { index: elevenst.length + ali.length >= 6, follow: true },
  };
}

const CHECKS = [
  {
    title: "행사 전 가격과 비교하기",
    body: "행사 기간에는 할인율 표시가 커지지만, 기준이 되는 정가가 평소 판매가보다 높게 적혀 있는 경우가 있습니다. 상품 상세의 가격 이력에서 최근 몇 주 동안 실제로 팔린 가격과 비교해 보고, 평소 가격과 차이가 작다면 급하게 살 이유가 줄어듭니다.",
  },
  {
    title: "쿠폰과 카드 할인은 최종 결제 화면에서",
    body: "행사 쿠폰은 발급 수량, 최소 주문 금액, 적용 카테고리, 결제 수단에 따라 적용 여부가 달라집니다. 드랍드에 표시된 가격은 수집 시점의 판매 페이지 가격이며 개인 쿠폰과 카드 할인은 반영하지 않으므로, 장바구니와 결제 화면에서 최종 금액을 확인하세요.",
  },
  {
    title: "해외 직구는 배송비·관세·배송 기간까지",
    body: "알리익스프레스 상품은 상품 가격 외에 배송비가 따로 붙거나, 합계 금액에 따라 관부가세 대상이 될 수 있습니다. 행사 기간에는 주문이 몰려 배송이 평소보다 늦어질 수 있으니, 필요한 날짜가 정해진 물건이라면 판매 페이지의 예상 도착일을 먼저 보세요.",
  },
  {
    title: "옵션·판매자·환불 조건",
    body: "같은 상품 이름이라도 옵션에 따라 가격이 다르고, 목록에 보이는 최저가가 가장 작은 용량이나 다른 색상의 가격일 수 있습니다. 판매자가 공식 스토어인지, 반품 배송비를 누가 부담하는지, 해외 판매자라면 환불 절차가 어떻게 되는지도 결제 전에 확인하세요.",
  },
  {
    title: "필요한 물건 목록을 먼저 정하기",
    body: "행사 페이지를 둘러보다 보면 계획에 없던 상품을 사게 되기 쉽습니다. 미리 살 물건과 생각한 가격 상한을 정해 두고, 그 가격보다 낮을 때만 사면 행사 할인이 실제 절약으로 이어집니다. 가격이 기대보다 높다면 가격 알림을 저장해 두고 다음 기회를 기다리는 것도 방법입니다.",
  },
];

function Section({ title, note, deals, more }: { title: string; note: string; deals: Deal[]; more: { href: string; label: string } }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">{note}</p>
      <div className="mt-4">
        {deals.length > 0 ? (
          <DealGrid deals={deals} />
        ) : (
          <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">지금은 이 조건에 맞는 수집 상품이 없습니다. 가격이 다시 확인되면 이곳에 표시됩니다.</p>
        )}
      </div>
      <Link href={more.href} className="mt-3 inline-block text-sm font-bold text-brand hover:underline">{more.label}</Link>
    </section>
  );
}

export default async function Sale1111Page() {
  const { elevenst, ali } = await loadSaleDeals();
  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "11월 11일 쇼핑 행사" }]} />
      <h1 className="text-2xl font-extrabold">11월 11일 쇼핑 행사, 사기 전에 가격부터 확인하세요</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
        11월 11일 전후에는 11번가와 알리익스프레스를 비롯한 여러 쇼핑몰이 큰 할인 행사를 엽니다. 이 페이지는 드랍드가 수집 중인 두 쇼핑몰의 특가 상품과, 행사 가격이 실제로 싼지 판단하는 순서를 함께 정리했습니다.
        행사 기간과 쿠폰 내용은 쇼핑몰마다 다르고 바뀔 수 있으니 각 쇼핑몰 공지에서 확인하세요.
      </p>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-extrabold">행사 상품을 사기 전 확인할 다섯 가지</h2>
        <ol className="mt-4 space-y-4">
          {CHECKS.map((check, i) => (
            <li key={check.title}>
              <h3 className="font-bold text-gray-900">{i + 1}. {check.title}</h3>
              <p className="mt-1 text-sm leading-7 text-gray-700">{check.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <Section
        title="11번가 특가 상품"
        note="드랍드가 판매 페이지 가격을 다시 확인한 11번가 상품입니다. 할인율이 큰 순서로 보여 줍니다."
        deals={elevenst}
        more={{ href: "/deals/domestic", label: "국내 쇼핑몰 특가 전체 보기 →" }}
      />
      <Section
        title="알리익스프레스 특가 상품"
        note="해외 직구 상품은 배송비와 관부가세 대상 여부를 함께 확인하세요."
        deals={ali}
        more={{ href: "/deals/global", label: "해외 직구 특가 전체 보기 →" }}
      />

      <section className="mt-10 rounded-2xl bg-gray-50 p-6 text-sm leading-7 text-gray-700">
        <h2 className="text-base font-extrabold text-gray-900">더 읽어 보기</h2>
        <ul className="mt-2 list-disc pl-5">
          <li><Link href="/guides" className="font-bold text-brand hover:underline">가격 비교 가이드</Link>: 가격 이력을 읽는 방법과 할인 표시를 확인하는 순서</li>
          <li><Link href="/price-drop" className="font-bold text-brand hover:underline">지금 가격 급락</Link>: 평소 가격보다 크게 떨어진 상품</li>
          <li><Link href="/unit-price" className="font-bold text-brand hover:underline">단위가격 계산</Link>: 용량이 다른 상품을 같은 기준으로 비교</li>
        </ul>
        <p className="mt-3 text-gray-500">드랍드의 상품 링크는 제휴 링크이며, 이를 통해 구매하면 드랍드가 수수료를 받을 수 있습니다. 구매 가격에는 영향이 없습니다.</p>
      </section>
    </div>
  );
}
