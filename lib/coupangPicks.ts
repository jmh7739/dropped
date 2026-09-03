/**
 * 손으로 고른 쿠팡 추천 상품 (수동 큐레이션).
 *   쿠팡 파트너스 → '상품 링크'에서 만든 제휴 URL(link.coupang.com/a/...)과
 *   상품 이미지/제목/가격을 여기에 넣으면 홈에 '🛒 쿠팡 추천' 카드로 뜬다.
 *   배열이 비면 섹션은 자동으로 숨겨진다.
 *   ⚠️ url은 반드시 쿠팡 파트너스 제휴 링크(우리 트래킹 포함)여야 수수료가 잡힌다.
 */
export interface CoupangPick {
  title: string; // 상품명
  image: string; // 상품 이미지 URL (쿠팡 상품페이지에서 복사)
  url: string; // 쿠팡 파트너스 제휴 링크 (link.coupang.com/a/...)
  price?: string; // 표시가격 예: "12,900원" (선택)
  note?: string; // 배지 문구 예: "역대급" (선택)
}

export const COUPANG_PICKS: CoupangPick[] = [
  // 예시(형식만 참고 — 실제 상품 넣을 때 이 줄 지우고 아래처럼):
  // {
  //   title: "○○ 무선 이어폰",
  //   image: "https://thumbnail...coupangcdn.com/....jpg",
  //   url: "https://link.coupang.com/a/XXXXXX",
  //   price: "39,900원",
  //   note: "베스트",
  // },
];
