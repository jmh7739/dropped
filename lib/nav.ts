/** 홈 URL 쿼리(category/sort/hot/q/page)를 일관되게 생성 */
export function homeHref(params: {
  category?: string;
  sort?: string;
  hot?: boolean;
  q?: string;
  page?: number;
  showEnded?: boolean; // 기본은 종료딜 숨김 → 켤 때만 se=1
  ps?: string; // 가격 상태 필터 (급락/최근최저/많이하락/방금)
  sec?: string; // 핫딜 세그먼트: 급락(기본) | 베스트(sec=best)
  cc?: string; // 베스트(국내몰) 카테고리 (독립 유지)
  cs?: string; // 베스트(국내몰) 정렬 (독립 유지)
}): string {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.sort && params.sort !== "discount") sp.set("sort", params.sort);
  if (params.hot) sp.set("hot", "1");
  if (params.q) sp.set("q", params.q);
  if (params.showEnded) sp.set("se", "1");
  if (params.ps) sp.set("ps", params.ps);
  if (params.sec && params.sec !== "drop") sp.set("sec", params.sec);
  if (params.cc) sp.set("cc", params.cc);
  if (params.cs && params.cs !== "popular") sp.set("cs", params.cs);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const q = sp.toString();
  return q ? `/?${q}` : "/";
}

export const PAGE_SIZE = 24;
