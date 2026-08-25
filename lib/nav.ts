/** 홈 URL 쿼리(category/sort/hot/q/page)를 일관되게 생성 */
export function homeHref(params: {
  category?: string;
  sort?: string;
  hot?: boolean;
  q?: string;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.sort && params.sort !== "discount") sp.set("sort", params.sort);
  if (params.hot) sp.set("hot", "1");
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const q = sp.toString();
  return q ? `/?${q}` : "/";
}

export const PAGE_SIZE = 24;
