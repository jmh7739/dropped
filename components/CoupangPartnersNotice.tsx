import { PROGRAM_NOTICE, type AffiliateProgram } from "@/lib/affiliate";

/**
 * 제휴 링크 바로 근처에 두는 고지. 실제로 화면에 있는 링크의 제휴 프로그램만 넘기세요.
 * 쿠팡 파트너스 고정 문구는 쿠팡 링크가 있을 때만, 알리익스프레스·링크프라이스는 각자의 문구로 표시합니다.
 * 상태가 없어 서버/클라이언트 어디서든 렌더링할 수 있습니다.
 */
export default function AffiliateNotice({
  programs,
  className = "",
}: {
  programs: AffiliateProgram[];
  className?: string;
}) {
  if (!programs.length) return null;
  return (
    <div
      role="note"
      aria-label="제휴 링크 안내"
      data-affiliate-notice={programs.join(" ")}
      className={`rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950 ${className}`}
    >
      {programs.map((p) => <p key={p} className={p === "coupang" ? "font-bold" : undefined}>{PROGRAM_NOTICE[p]}</p>)}
    </div>
  );
}
