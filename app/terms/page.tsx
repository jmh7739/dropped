import type { Metadata } from "next";

export const metadata: Metadata = { title: "이용안내·면책" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 text-sm leading-7 text-gray-700">
      <h1 className="mb-5 text-2xl font-extrabold text-gray-900">이용안내·면책</h1>
      <p>
        떨어졌다는 여러 판매처의 가격 정보를 수집해 비교를 돕는 정보 제공 서비스이며,
        상품의 판매자나 거래 당사자가 아닙니다.
      </p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">가격과 상품 정보</h2>
      <p>
        표시 가격, 배송비, 재고, 쿠폰과 옵션은 수집 시점 이후 달라질 수 있습니다. 결제 전
        판매 페이지에서 상품 옵션과 최종 결제 금액을 반드시 확인해 주세요.
      </p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">제휴마케팅</h2>
      <p>
        일부 링크는 제휴 링크입니다. 해당 링크를 통해 구매하면 이용자에게 추가 비용 없이
        떨어졌다에 일정액의 수수료가 지급될 수 있습니다. 수수료 여부가 가격 판정 기준을
        바꾸지는 않습니다.
      </p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">거래 책임</h2>
      <p>
        결제, 배송, 교환, 환불, 상품 하자 등 거래 관련 사항은 이용자와 해당 판매처 사이의
        정책과 약정에 따릅니다. 여행 정보도 예약 전 원문 조건과 판매 조건을 확인해야 합니다.
      </p>

      <p className="mt-6 text-xs text-gray-400">시행일: 2026년 9월 2일</p>
    </article>
  );
}
