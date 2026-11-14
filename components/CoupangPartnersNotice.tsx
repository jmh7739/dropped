import { COUPANG_PARTNERS_NOTICE, GENERAL_AFFILIATE_NOTICE } from "@/lib/affiliate";

/**
 * 제휴 링크(쿠팡 파트너스 포함) 바로 근처에 보이게 두는 고지.
 * 서버/클라이언트 어디서든 렌더링할 수 있도록 상태가 없다.
 */
export default function CoupangPartnersNotice({
  className = "",
  showGeneral = true,
}: {
  className?: string;
  showGeneral?: boolean;
}) {
  return (
    <div
      role="note"
      aria-label="제휴 링크 안내"
      data-affiliate-notice="coupang"
      className={`rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] leading-5 text-amber-950 ${className}`}
    >
      <p className="font-bold">{COUPANG_PARTNERS_NOTICE}</p>
      {showGeneral && <p className="mt-0.5 text-gray-700">{GENERAL_AFFILIATE_NOTICE}</p>}
    </div>
  );
}
