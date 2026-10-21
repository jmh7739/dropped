import { merchantSavings, money, type RetailOffer } from '@/lib/retail';

export default function RetailDiscount({ offer }: { offer: RetailOffer }) {
  const savings = merchantSavings(offer);
  if (!savings) return null;
  return <div data-merchant-discount className="my-3 rounded-xl border border-red-100 bg-white p-3 text-sm">
    <p className="text-xs text-gray-600">판매처 표시 기준가 <del>{money(savings.original)}</del></p>
    <p className="mt-1 font-extrabold text-red-700">{money(savings.amount)} 할인 <span className="text-xs font-medium">{offer.promotion === '멤버특가' ? '· 회원 조건 적용' : '· 전단 조건 적용'}</span></p>
    <p className="mt-1 text-xs leading-5 text-gray-500">공식 전단의 기준가와 행사가 차이이며, 과거 관측가·역대 최저가 비교가 아닙니다.</p>
  </div>;
}
