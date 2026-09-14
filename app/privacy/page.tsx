import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보 처리방침", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 text-sm leading-7 text-gray-700">
      <h1 className="mb-5 text-2xl font-extrabold text-gray-900">개인정보 처리방침</h1>
      <p>떨어졌다는 회원가입을 받지 않으며 이름, 전화번호, 주소 같은 개인정보를 직접 입력받지 않습니다.</p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">자동으로 처리되는 정보</h2>
      <p>
        서비스 품질과 방문 통계를 위해 접속 시각, 기기·브라우저 종류, 방문 페이지 같은
        기술 정보가 Vercel Analytics와 Google Analytics 4를 통해 처리될 수 있습니다.
        Google Analytics 4는 방문 페이지와 기기 정보 등을 Google에 전송하고 방문 분석용
        쿠키를 사용할 수 있습니다. 좋아요 중복 방지를 위해
        브라우저에 무작위 방문자 식별자와 좋아요 기록을 저장합니다. 이 식별자는 이름이나
        연락처와 연결하지 않습니다.
      </p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">광고 및 쿠키</h2>
      <p>
        이 사이트는 Google AdSense 광고 코드를 사용합니다. Google을 포함한 제3자 광고
        사업자는 이 사이트 또는 다른 사이트의 방문 기록을 바탕으로 광고를 제공하기 위해
        쿠키를 저장하거나 읽을 수 있으며, 웹 비콘·IP 주소·기타 식별자를 이용할 수
        있습니다. 광고 코드가 있는 페이지에서는 광고가 보이지 않아도 관련 요청이 발생할
        수 있습니다. 자세한 내용은{" "}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
          Google의 파트너 사이트 정보 이용 안내
        </a>
        를 확인해 주세요.
      </p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">제3자 사이트</h2>
      <p>
        구매·예약 버튼을 누르면 쿠팡, 알리익스프레스, 링크프라이스 및 각 판매처 등 외부
        사이트로 이동합니다. 여행 링크에는 Travelpayouts 제휴 링크 전환 코드가 적용될 수
        있습니다. 이동 후의 정보 처리는 해당 사이트의 정책을 따릅니다.
      </p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">이용자 선택</h2>
      <p>
        브라우저 설정에서 사이트 저장 데이터와 쿠키를 삭제할 수 있습니다. 삭제하면 저장된
        좋아요 여부와 익명 방문자 식별자가 초기화됩니다. Google 광고 개인 최적화는{" "}
        <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
          Google 내 광고 센터
        </a>
        에서 관리할 수 있습니다.
      </p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">문의</h2>
      <p>
        개인정보 관련 문의는{" "}
        <a href="mailto:aimarket7329@gmail.com" className="font-semibold text-brand">
          aimarket7329@gmail.com
        </a>
        으로 연락해 주세요.
      </p>

      <p className="mt-6 text-xs text-gray-400">최종 수정일: 2026년 9월 14일</p>
    </article>
  );
}
