import { supabase } from "./supabase";

export interface RealtimeTrend {
  keyword: string;
  normalizedKeyword: string;
  rank: number;
  previousRank: number | null;
  rankChange: number | null;
  status: "up" | "down" | "same" | "NEW";
  hotScore: number;
  category: string;
  affiliateUrl: string | null;
  collectedAt: string;
}

export interface TrendingProduct {
  id: number;
  keyword: string;
  title: string;
  imageUrl: string;
  price: number | null;
  productScore: number;
  hotScore: number;
  category: string;
  updatedAt: string;
  platform: string;
}

type RealtimeTrendRow = {
  keyword: string;
  normalized_keyword: string;
  rank: number;
  previous_rank: number | null;
  rank_change: number | null;
  status: RealtimeTrend["status"];
  hot_score: number;
  category: string | null;
  affiliate_search_url: string | null;
  collected_at: string;
};

function usableProductImage(value: unknown): string {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) && !/favicon(?:\.ico)?|(?:^|[\/_-])logo(?:[\/_-]|\.)|placeholder|blank|spacer|1x1|f30_30/i.test(url) ? url : "";
}

function blockedTrendKeyword(value: unknown): boolean {
  const raw = String(value || "").toLowerCase().trim();
  const keyword = raw.replace(/[^0-9a-z가-힣]/gi, "");
  const matchOrSports = /(?:^|\s)(?:vs\.?|versus|v)(?:\s|$)/i.test(raw)
    || /(?:belgium|france|england|germany|spain|italy|portugal|brazil|argentina|japan|korea)(?:vs|versus)(?:belgium|france|england|germany|spain|italy|portugal|brazil|argentina|japan|korea)/.test(keyword)
    || /(?:벨기에|프랑스|잉글랜드|영국|독일|스페인|이탈리아|포르투갈|브라질|아르헨티나|일본|한국)(?:대|전|vs)(?:벨기에|프랑스|잉글랜드|영국|독일|스페인|이탈리아|포르투갈|브라질|아르헨티나|일본|한국)/.test(keyword)
    || /(?:축구|야구|농구|배구|테니스|국가대표|챔피언스리그|프리미어리그|유로파리그|경기예측|선발명단|하이라이트)/.test(keyword);
  const companyOnly = /^(?:삼성전기|삼성전자|lg전자|엘지전자|sk하이닉스|현대자동차|현대차|기아|포스코홀딩스|현대모비스|한화오션|두산에너빌리티)$/.test(keyword)
    || /(?:그룹|홀딩스|증권|건설|중공업|바이오로직스|모비스|전기|전자)$/.test(keyword)
    || /(?:주가|실적|공시|배당|채용|회장|대표|노조|파업)$/.test(keyword);
  const nonCommerceTrend = /^(?:상사화|꽃무릇|벚꽃|진달래|개나리|유채꽃|코스모스|억새|단풍)$/.test(keyword)
    || /(?:꽃축제|벚꽃축제|불꽃축제|축제일정|개화시기|개화상황|단풍시기|명소|날씨|차례상|제사상|명절음식|연휴)$/.test(keyword)
    || /(?:경기결과|경기일정|중계|스코어|순위|출연진|재방송|몇부작|프로필|근황|사건|사고|논란)$/.test(keyword)
    || /(?:아시안게임|올림픽|월드컵|대통령|국회의원|금리|환율|코스피|코스닥)$/.test(keyword);
  return matchOrSports || companyOnly || nonCommerceTrend || /(에어컨|냉난방기|전자레인지|전자렌지|정수기|공기청정기|세탁기|냉장고|음식물처리기|비데|안마의자)$/.test(keyword) || /a4용지|복사용지|빨래건조대|의류건조대/.test(keyword) || keyword === "건조대" || keyword === "가습기" || keyword === "수건";
}

function blockedSeasonalProduct(value: unknown): boolean {
  const title = String(value || "").toLowerCase().replace(/\s+/g, "");
  const currentYear = new Date().getFullYear();
  const staleYear = /(?:20)?(\d{2})년/.exec(title);
  if (staleYear) {
    const yy = Number(staleYear[1]);
    const year = yy < 100 ? 2000 + yy : yy;
    if (year < currentYear) return true;
  }
  return /설선물|설날선물|구정선물/.test(title);
}

function blockedLowTrustProduct(value: unknown): boolean {
  const title = String(value || "").toLowerCase().replace(/\s+/g, " ");
  return /마른\s*유바|인형용.*(?:모헤어|머리카락)|모헤어.*인형|랜덤\s*(?:박스|상품)|복불복|미스터리\s*박스/.test(title);
}

const TREND_BRANDS = [
  "삼성", "갤럭시", "애플", "아이폰", "아이패드", "엘지", "lg", "다이슨",
  "닌텐도", "플레이스테이션", "소니", "캐논", "나이키", "아디다스", "뉴발란스",
  "호카", "살로몬", "헤라", "설화수", "에스티로더", "스팸", "정관장", "레고",
  "포켓몬", "샤오미", "로보락", "발뮤다", "쿠쿠", "브라운", "필립스",
];

const PRODUCT_INTENT = /선물세트|화장품|스킨|로션|에센스|크림|아이크림|쿠션|파운데이션|립스틱|샴푸|운동화|등산화|구두|슬리퍼|샌들|바람막이|패딩|가디건|원피스|재킷|자켓|가방|백팩|스마트폰|태블릿|노트북|모니터|게임기|콘솔|이어폰|헤드폰|카메라|청소기|안마기|캠핑용품|골프채|낚싯대|유모차|카시트|기저귀|분유|갈비|한우|꽃게|대하|굴비|과일세트|홍삼|영양제|유산균|비타민|카드|스위치|플레이스테이션|에어팟|갤럭시|아이폰|아이패드/;

function likelyProductTrend(value: unknown): boolean {
  const raw = String(value || "");
  const keyword = raw.toLowerCase().replace(/[^0-9a-z가-힣]/gi, "");
  if (!keyword || blockedTrendKeyword(raw)) return false;
  const brand = TREND_BRANDS.find((item) => keyword.includes(item));
  return PRODUCT_INTENT.test(keyword) || Boolean(brand && keyword.length >= brand.length + 2);
}

function trendProductMatches(keywordValue: unknown, titleValue: unknown): boolean {
  const keyword = String(keywordValue || "").toLowerCase().replace(/[^0-9a-z가-힣]/gi, "");
  const title = String(titleValue || "").toLowerCase().replace(/[^0-9a-z가-힣]/gi, "");
  if (!keyword || !title) return false;
  const mentionedBrands = TREND_BRANDS.filter((brand) => keyword.includes(brand));
  if (mentionedBrands.length && !mentionedBrands.every((brand) => title.includes(brand))) return false;
  const requiredIntents = ['카드', '스위치', '게임기', '운동화', '이어폰', '헤드폰', '노트북', '태블릿', '모니터']
    .filter((intent) => keyword.includes(intent));
  if (requiredIntents.some((intent) => !title.includes(intent))) return false;
  if (/\d+주년/.test(keyword)) {
    const anniversary = keyword.match(/\d+주년/)?.[0];
    if (anniversary && !title.includes(anniversary)) return false;
  }
  return true;
}

function correctedProductCategory(raw: unknown, titleValue: unknown, keywordValue: unknown) {
  const text = `${titleValue ?? ""} ${keywordValue ?? ""}`.toLowerCase().replace(/\s+/g, "");
  if (/과자|쿠키|비스킷|산도|초콜릿|사탕|캔디|젤리|라면|커피|차|한우|갈비|과일|굴비|꽃게|대하|식품|간식/.test(text)) return "식품";
  if (/노트북|태블릿|모니터|스마트폰|아이폰|갤럭시|이어폰|헤드폰|카메라|게임기|플레이스테이션|닌텐도/.test(text)) return "디지털";
  if (/화장품|스킨|로션|에센스|크림|쿠션|파운데이션|립스틱|샴푸/.test(text)) return "뷰티";
  if (/기저귀|분유|유모차|카시트|아기|유아/.test(text)) return "육아";
  if (/운동화|등산화|구두|슬리퍼|샌들|바람막이|패딩|가디건|원피스|재킷|자켓|가방|백팩/.test(text)) return "패션";
  return String(raw || "기타");
}

export async function getRealtimeTrends(): Promise<RealtimeTrend[]> {
  if (!supabase) return [];
  const { data: latest, error: latestError } = await supabase.from("realtime_trends").select("collected_at").eq("is_published", true).order("collected_at", { ascending: false }).limit(1);
  if (latestError || !latest?.length) return [];
  const collectedAt = latest[0].collected_at;
  const { data, error } = await supabase.from("realtime_trends").select("keyword,normalized_keyword,rank,previous_rank,rank_change,status,hot_score,category,affiliate_search_url,collected_at").eq("collected_at", collectedAt).eq("is_published", true).order("rank").limit(20);
  if (error || !data) return [];
  return (data as RealtimeTrendRow[]).filter((row) => likelyProductTrend(row.keyword)).map((row) => {
    const key = row.normalized_keyword || row.keyword.toLowerCase().replace(/\s+/g, "");
    return {
      keyword: row.keyword,
      normalizedKeyword: key,
      rank: Number(row.rank),
      previousRank: row.previous_rank,
      rankChange: row.rank_change,
      status: row.status,
      hotScore: Number(row.hot_score),
      category: row.category || "",
      affiliateUrl: row.affiliate_search_url || null,
      collectedAt: row.collected_at,
    };
  });
}

export async function getTrendingProducts(limit = 40): Promise<TrendingProduct[]> {
  if (!supabase) return [];
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("trending_products").select("keyword,product_score,hot_score,category,updated_at,products(id,title,image_url,list_price,platform)").eq("is_active", true).gte("updated_at", cutoff).order("hot_score", { ascending: false }).order("product_score", { ascending: false }).limit(Math.max(limit * 5, 200));
  if (error || !data) return [];
  const candidates = data.flatMap((row: any) => {
    if (!likelyProductTrend(row.keyword)) return [];
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (blockedSeasonalProduct(product?.title) || blockedLowTrustProduct(product?.title) || !trendProductMatches(row.keyword, product?.title)) return [];
    const imageUrl = usableProductImage(product?.image_url);
    const price = product?.list_price != null ? Number(product.list_price) : null;
    if (!product || !imageUrl || (price !== null && price < 1000)) return [];
    return [{ id: product.id, keyword: row.keyword, title: product.title, imageUrl, price, productScore: Number(row.product_score), hotScore: Number(row.hot_score), category: correctedProductCategory(row.category, product.title, row.keyword), updatedAt: row.updated_at, platform: product.platform || "coupang" }];
  });

  const result: TrendingProduct[] = [];
  const categoryCount = new Map<string, number>();
  const keywordCount = new Map<string, number>();
  for (const product of candidates) {
    const category = product.category || "기타";
    const keyword = product.keyword.toLowerCase().replace(/\s+/g, "");
    if ((categoryCount.get(category) ?? 0) >= 12) continue;
    if ((keywordCount.get(keyword) ?? 0) >= 3) continue;
    result.push(product);
    categoryCount.set(category, (categoryCount.get(category) ?? 0) + 1);
    keywordCount.set(keyword, (keywordCount.get(keyword) ?? 0) + 1);
    if (result.length >= Math.min(limit, 40)) break;
  }
  return result;
}
