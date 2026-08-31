/** 홈 URL 쿼리(category/sort/hot/q/page)를 일관되게 생성 */
export function homeHref(params: {
  category?: string;
  sort?: string;
  hot?: boolean;
  q?: string;
  page?: number;
  showEnded?: boolean; // 기본은 종료딜 숨김 → 켤 때만 se=1
}): string {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.sort && params.sort !== "discount") sp.set("sort", params.sort);
  if (params.hot) sp.set("hot", "1");
  if (params.q) sp.set("q", params.q);
  if (params.showEnded) sp.set("se", "1");
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const q = sp.toString();
  return q ? `/?${q}` : "/";
}

export const PAGE_SIZE = 24;
