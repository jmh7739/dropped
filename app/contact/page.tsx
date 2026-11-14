import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "문의하기",
  description: "떨어졌다 가격 정보 오류 제보, 상품 삭제 요청, 제휴·광고 문의 방법을 안내합니다.",
  alternates: { canonical: "/contact" },
};

const EMAIL = "aimarket7329@gmail.com";

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 text-base leading-7 text-gray-700">
      <h1 className="text-2xl font-extrabold text-gray-900">문의하기</h1>
      <p className="mt-4">
        떨어졌다는 회원가입 없이 운영되는 가격 이력 정보 사이트입니다. 문의는 이메일로만 받고 있으며,
        보통 영업일 기준 2~3일 안에 답장을 드립니다.
      </p>
      <p className="mt-4 rounded-lg bg-gray-50 p-4 text-lg font-bold text-gray-900">
        이메일: <a href={`mailto:${EMAIL}`} className="text-brand underline">{EMAIL}</a>
      </p>

      <h2 className="mt-8 text-lg font-bold text-gray-900">이런 내용을 보내 주세요</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li><strong>가격이 틀린 경우</strong>: 상품 페이지 주소(예: dropped.kr/price/123), 판매 페이지에서 본 가격, 확인한 시각과 선택한 옵션을 적어 주세요. 옵션·배송비·쿠폰 때문에 가격이 다르게 보일 수 있어 함께 확인합니다.</li>
        <li><strong>상품·이미지 삭제 요청</strong>: 판매자 또는 권리자라면 해당 페이지 주소와 요청 사유를 보내 주세요.</li>
        <li><strong>사이트 오류</strong>: 사용한 기기(휴대폰·PC), 브라우저, 어떤 화면에서 문제가 생겼는지 알려 주세요.</li>
        <li><strong>제휴·광고 문의</strong>: 회사명과 제안 내용을 간단히 적어 주세요.</li>
      </ul>

      <h2 className="mt-8 text-lg font-bold text-gray-900">답변하기 어려운 문의</h2>
      <p className="mt-3">
        주문, 배송, 환불, 교환은 떨어졌다가 아니라 실제 판매처(쿠팡, 알리익스프레스, 각 쇼핑몰)에서 처리합니다.
        구매한 판매처의 고객센터로 문의해 주세요. 결제 정보나 비밀번호는 절대 이메일로 보내지 마세요.
      </p>

      <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/about" className="text-brand hover:underline">사이트 소개</Link>
        <Link href="/privacy" className="text-brand hover:underline">개인정보처리방침</Link>
        <Link href="/terms" className="text-brand hover:underline">이용안내·면책</Link>
      </div>
    </article>
  );
}
