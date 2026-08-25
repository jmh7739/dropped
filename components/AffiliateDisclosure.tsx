export default function AffiliateDisclosure() {
  return (
    <footer className="mt-10 border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-5 text-xs leading-relaxed text-gray-500">
        <p>
          이 사이트는 쿠팡파트너스, 알리익스프레스 어필리에이트 등 제휴마케팅
          활동의 일환으로 이에 따른 일정액의 수수료를 제공받습니다.
        </p>
        <p className="mt-1 text-gray-400">
          가격·할인 정보는 수집 시점 기준이며 실제와 다를 수 있습니다. 구매 전
          판매 페이지에서 최종 가격을 반드시 확인하세요.
        </p>
        <p className="mt-2 text-gray-400">© {new Date().getFullYear()} 떨어졌다</p>
      </div>
    </footer>
  );
}
