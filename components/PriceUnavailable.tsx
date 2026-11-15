import Link from "next/link";

/**
 * 과거에 공개한 상품이지만 지금은 가격 기록을 읽을 수 없을 때. 엣지가 data-price-unavailable 표식을 보고
 * 503 + Retry-After로 응답하므로, 검색엔진은 이 주소를 지우지 않고 나중에 다시 확인한다.
 */
export default function PriceUnavailable({ id }: { id: number }) {
  return (
    <div data-price-unavailable="1" className="mx-auto max-w-2xl py-6">
      <h1 className="text-2xl font-black text-gray-950">상품 #{id} 가격 기록 갱신이 잠시 지연되고 있어요</h1>
      <p className="mt-3 text-base leading-7 text-gray-700">
        이 상품의 가격 기록은 남아 있지만, 지금은 기록 저장소를 읽을 수 없어 그래프와 평균가를 보여 드리지 못합니다.
        잠시 뒤 다시 열어 주세요. 그동안 아래 페이지는 그대로 이용할 수 있습니다.
      </p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-3">
        <li><Link href="/store-deals" className="flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 font-bold">마트·편의점 행사</Link></li>
        <li><Link href="/tracking" className="flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 font-bold">가격 추적 방식</Link></li>
        <li><Link href="/guides" className="flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 font-bold">가격 비교 가이드</Link></li>
      </ul>
    </div>
  );
}
