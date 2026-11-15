import { withOg } from "@/lib/seo";
import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = withOg({
  title: "개인정보 처리방침",
  description: "Dropped(떨어졌다)가 처리하는 접속기록·쿠키·문의 이메일의 처리 목적, 보유 기간, 처리위탁과 국외 이전, 행태정보 거부 방법, 이용자 권리와 연락처를 안내합니다.",
  alternates: { canonical: "/privacy" },
});

const CONTACT = "aimarket7329@gmail.com";
const h2 = "mb-2 mt-8 text-lg font-bold text-gray-900";
const a = "font-semibold text-brand underline";
const cell = "border border-gray-200 px-3 py-2 align-top";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-6 text-base leading-8 text-gray-700">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "개인정보 처리방침" }]} />
      <h1 className="mb-4 text-2xl font-extrabold text-gray-900">개인정보 처리방침</h1>
      <p>
        Dropped(떨어졌다, 이하 &lsquo;사이트&rsquo;)는 「개인정보 보호법」 제30조에 따라 이용자의 개인정보를 어떻게 처리하는지 알리고,
        관련 고충을 신속하게 처리하기 위해 이 처리방침을 둡니다. 사이트는 회원가입을 받지 않으며 이름·전화번호·주소를 입력받지 않습니다.
      </p>

      <h2 className={h2}>1. 처리 목적</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>사이트 제공과 보안: 접속 처리, 오류·부정 접속 확인, 서비스 안정성 유지</li>
        <li>방문 통계: 어떤 페이지가 이용되는지 파악해 콘텐츠를 개선(Google Analytics 4)</li>
        <li>광고: Google AdSense 광고 게재와 광고 성과 측정(광고를 게재하는 경우)</li>
        <li>문의 응대: 이메일로 받은 문의에 답변하고 처리 결과를 알림</li>
        <li>좋아요 중복 방지: 같은 브라우저의 반복 좋아요를 막기 위한 무작위 식별자 확인</li>
      </ul>

      <h2 className={h2}>2. 처리 항목과 수집 방법</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm leading-6">
          <thead><tr className="bg-gray-50"><th className={cell}>구분</th><th className={cell}>항목</th><th className={cell}>수집 방법</th></tr></thead>
          <tbody>
            <tr><td className={cell}>접속기록</td><td className={cell}>IP 주소, 접속 일시, 요청 주소, 브라우저·기기 정보(User-Agent), 참조 주소</td><td className={cell}>사이트 접속 시 Cloudflare 서버에서 자동 생성</td></tr>
            <tr><td className={cell}>쿠키·온라인 식별자</td><td className={cell}>Google Analytics 쿠키(_ga 등), 광고 쿠키·광고 식별자, 방문 페이지·체류 시간 등 행태정보</td><td className={cell}>Google Analytics 4·Google AdSense 스크립트가 자동 수집</td></tr>
            <tr><td className={cell}>브라우저 저장 정보</td><td className={cell}>무작위 방문자 식별자, 좋아요 기록, 관심 상품·장보기 목록, 목표가 기록, 마지막 방문 시각</td><td className={cell}>이용자 브라우저의 로컬 저장소에 저장(좋아요 시 무작위 식별자와 상품 번호만 서버에 전송)</td></tr>
            <tr><td className={cell}>문의 이메일</td><td className={cell}>이메일 주소, 이름(적은 경우), 문의 내용</td><td className={cell}>이용자가 보낸 이메일</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className={h2}>3. 보유 기간과 파기</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>접속기록: Cloudflare의 보관 정책에 따라 보관 후 자동 삭제되며, 사이트 운영자는 별도로 사본을 만들지 않습니다.</li>
        <li>Google Analytics 데이터: Google Analytics 데이터 보관 설정에 따른 기간(최대 14개월)이 지나면 자동 삭제됩니다.</li>
        <li>광고 쿠키: Google 정책에 따른 쿠키 만료 시까지. 이용자가 브라우저에서 언제든 삭제할 수 있습니다.</li>
        <li>문의 이메일: 답변 완료 후 1년간 보관하고 지체 없이 삭제합니다. 다른 법령에서 보관을 요구하면 그 기간 동안 보관합니다.</li>
        <li>브라우저 저장 정보: 이용자가 사이트 데이터를 삭제할 때까지 이용자 기기에만 남습니다. 좋아요 식별자는 상품 좋아요 집계가 유지되는 동안 보관합니다.</li>
        <li>파기 방법: 전자 파일은 복구할 수 없는 방법으로 삭제하고, 종이 문서는 만들지 않습니다.</li>
      </ul>

      <h2 className={h2}>4. 제3자 제공</h2>
      <p>사이트는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 법령에 따라 수사기관 등이 적법한 절차로 요구하는 경우는 예외입니다. 구매·예약 버튼으로 이동한 외부 판매처(쿠팡, 알리익스프레스, 링크프라이스 제휴 쇼핑몰, 여행 예약처 등)에서의 정보 처리는 각 사이트의 처리방침을 따릅니다.</p>

      <h2 className={h2}>5. 처리위탁</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm leading-6">
          <thead><tr className="bg-gray-50"><th className={cell}>수탁자</th><th className={cell}>위탁 업무</th></tr></thead>
          <tbody>
            <tr><td className={cell}>Cloudflare, Inc.</td><td className={cell}>사이트 호스팅, 콘텐츠 전송, 보안(접속기록 처리)</td></tr>
            <tr><td className={cell}>Google LLC</td><td className={cell}>방문 통계 분석(Google Analytics 4), 광고 게재·측정(Google AdSense), 문의 이메일 수신(Gmail)</td></tr>
            <tr><td className={cell}>Supabase, Inc.</td><td className={cell}>가격 기록·좋아요 집계 데이터베이스 운영(무작위 방문자 식별자 저장)</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className={h2}>6. 개인정보의 국외 이전</h2>
      <p>위 서비스는 국외 사업자가 운영하므로 아래와 같이 개인정보가 국외로 이전됩니다. 이전을 원하지 않으면 브라우저에서 쿠키를 차단하거나 사이트 이용을 중단할 수 있으며, 이 경우 방문 통계·맞춤 광고에서 제외됩니다(사이트 열람 자체는 접속기록 처리가 필요합니다).</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm leading-6">
          <thead><tr className="bg-gray-50"><th className={cell}>이전받는 자(국가)</th><th className={cell}>항목</th><th className={cell}>일시·방법</th><th className={cell}>목적</th><th className={cell}>보유·이용 기간</th></tr></thead>
          <tbody>
            <tr><td className={cell}>Cloudflare, Inc.(미국, 전 세계 데이터센터) · privacyquestions@cloudflare.com</td><td className={cell}>접속기록</td><td className={cell}>접속할 때마다 네트워크로 전송</td><td className={cell}>호스팅·보안</td><td className={cell}>Cloudflare 보관 정책에 따름</td></tr>
            <tr><td className={cell}>Google LLC(미국) · https://support.google.com/policies</td><td className={cell}>쿠키, 행태정보, IP 주소(분석 시 축약), 기기 정보, 문의 이메일</td><td className={cell}>페이지를 볼 때마다·이메일 수신 시 네트워크로 전송</td><td className={cell}>통계 분석, 광고 게재·측정, 이메일 수신</td><td className={cell}>위 3항의 기간</td></tr>
            <tr><td className={cell}>Supabase, Inc.(미국 사업자, 데이터 저장 지역은 서비스 설정 지역)</td><td className={cell}>무작위 방문자 식별자, 좋아요한 상품 번호</td><td className={cell}>좋아요를 누를 때 네트워크로 전송</td><td className={cell}>좋아요 중복 방지·집계</td><td className={cell}>집계 유지 기간</td></tr>
          </tbody>
        </table>
      </div>

      <h2 className={h2}>7. 행태정보의 수집·이용과 거부 방법</h2>
      <p>Google Analytics와 Google AdSense는 쿠키로 이 사이트와 다른 사이트의 방문 기록(행태정보)을 수집해 통계 분석과 맞춤 광고에 사용할 수 있습니다. 거부하려면 다음 방법을 이용하세요.</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Google 맞춤 광고 끄기: <a className={a} href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">https://adssettings.google.com</a></li>
        <li>제3자 광고 사업자의 맞춤 광고 거부: <a className={a} href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer">https://www.aboutads.info</a></li>
        <li>Google Analytics 수집 거부: <a className={a} href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google 애널리틱스 차단 브라우저 부가기능</a></li>
        <li>브라우저 쿠키 설정: Chrome은 설정 &gt; 개인정보 및 보안 &gt; 서드파티 쿠키, Edge는 설정 &gt; 쿠키 및 사이트 권한, Safari는 설정 &gt; 개인정보 보호에서 쿠키를 차단하거나 삭제할 수 있습니다.</li>
      </ul>
      <p className="mt-2">Google의 정보 처리 방식은 <a className={a} href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Google 파트너 사이트 정보 이용 안내</a>에서 확인할 수 있습니다.</p>

      <h2 className={h2}>8. 정보주체의 권리와 행사 방법</h2>
      <p>이용자는 언제든지 자신의 개인정보 열람, 정정·삭제, 처리정지, 동의 철회를 요구할 수 있습니다. 아래 이메일로 요청하면 지체 없이(10일 이내) 조치하고 결과를 알려 드립니다. 법정대리인이나 위임받은 사람을 통해서도 요청할 수 있습니다. 사이트는 이름·연락처와 연결된 계정을 두지 않으므로, 브라우저에 저장된 정보는 브라우저의 사이트 데이터 삭제로 바로 지울 수 있습니다.</p>

      <h2 className={h2}>9. 안전성 확보 조치</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>전 구간 HTTPS 암호화 전송</li>
        <li>관리 계정 접근 권한 최소화, 인증 키는 공개 저장소에 두지 않음</li>
        <li>데이터베이스 접근을 읽기 전용 공개 키와 서버 전용 키로 분리</li>
        <li>필요 없는 개인정보를 수집하지 않는 설계(회원가입·결제 기능 없음)</li>
      </ul>

      <h2 className={h2}>10. 개인정보 보호책임자</h2>
      <p>직책: 운영자 · 연락처: <a className={a} href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
      <p>개인정보 관련 문의, 불만, 피해 구제 요청은 위 연락처로 보내 주세요.</p>

      <h2 className={h2}>11. 권익침해 구제 방법</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>개인정보침해신고센터: (국번없이) 118, <a className={a} href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer">privacy.kisa.or.kr</a></li>
        <li>개인정보분쟁조정위원회: 1833-6972, <a className={a} href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer">www.kopico.go.kr</a></li>
        <li>대검찰청 사이버수사과: (국번없이) 1301, <a className={a} href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer">www.spo.go.kr</a></li>
        <li>경찰청 사이버수사국: (국번없이) 182, <a className={a} href="https://ecrm.police.go.kr" target="_blank" rel="noopener noreferrer">ecrm.police.go.kr</a></li>
      </ul>

      <h2 className={h2}>12. 처리방침의 변경</h2>
      <p>내용을 추가·삭제·수정하면 시행 7일 전부터 이 페이지에 알립니다. 이용자 권리에 중요한 변경은 30일 전에 알립니다.</p>
      <p className="mt-6 text-sm text-gray-600">시행일: 2026년 11월 15일 · 이전 버전: 2026년 10월 21일</p>
    </article>
  );
}
