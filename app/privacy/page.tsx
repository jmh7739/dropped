import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보 처리방침" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 text-sm leading-7 text-gray-700">
      <h1 className="mb-5 text-2xl font-extrabold text-gray-900">개인정보 처리방침</h1>
      <p>떨어졌다는 회원가입을 받지 않으며 이름, 전화번호, 주소 같은 개인정보를 직접 입력받지 않습니다.</p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">자동으로 처리되는 정보</h2>
      <p>
        서비스 품질과 방문 통계를 위해 접속 시각, 기기·브라우저 종류, 방문 페이지 같은
        기술 정보가 Vercel Analytics를 통해 처리될 수 있습니다. 좋아요 중복 방지를 위해
        브라우저에 무작위 방문자 식별자와 좋아요 기록을 저장합니다. 이 식별자는 이름이나
        연락처와 연결하지 않습니다.
      </p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">제3자 사이트</h2>
      <p>
        구매·예약 버튼을 누르면 쿠팡, 알리익스프레스, 링크프라이스 및 각 판매처 등 외부
        사이트로 이동합니다. 이동 후의 정보 처리는 해당 사이트의 정책을 따릅니다.
      </p>

      <h2 className="mb-1 mt-6 text-base font-bold text-gray-900">이용자 선택</h2>
      <p>
        브라우저 설정에서 사이트 저장 데이터와 쿠키를 삭제할 수 있습니다. 삭제하면 저장된
        좋아요 여부와 익명 방문자 식별자가 초기화됩니다.
      </p>

      <p className="mt-6 text-xs text-gray-400">시행일: 2026년 9월 2일</p>
    </article>
  );
}

