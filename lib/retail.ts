export const RETAILERS = [
  { id: 'cu', name: 'CU', type: '편의점', color: '#652e91', url: 'https://cu.bgfretail.com/event/plus.do?category=event&depth2=1&sf=N', note: '1+1·2+1 상품과 점포별 적용 조건 확인' },
  { id: 'gs25', name: 'GS25', type: '편의점', color: '#0076bc', url: 'https://www.gsretail.com/brand/gs25', note: '공식 브랜드·행사 안내 · 상품 가격 연동은 이용 허용 확인 후 제공' },
  { id: 'emart', name: '이마트', type: '마트', color: '#9b6900', url: 'https://emartapp.emart.com/leaflet/leafletView_EL.do?trcknCode=MainLV', note: '방문할 점포를 선택한 뒤 전단·행사 확인' },
  { id: 'lotte', name: '롯데마트', type: '마트', color: '#c80028', url: 'https://company.lottemart.com/mobiledowa/event/event_list.asp', note: '제타플렉스 서울역점 상품 조회 가격 · 다른 점포 가격과 구분' },
  { id: 'costco', name: '코스트코', type: '창고형', color: '#00529b', url: 'https://www.costco.co.kr/', note: '온라인몰과 매장 행사·회원 조건을 구분해 확인' },
  { id: 'traders', name: '트레이더스', type: '창고형', color: '#387526', url: 'https://www.traders.co.kr/index.do', note: '방문 점포·회원 전용 혜택·행사 조건 확인' },
  { id: 'nobrand', name: '노브랜드', type: '마트', color: '#846600', url: 'https://store.emart.com/branch/list.do?trcknCode=header_store', note: '점포 찾기에서 노브랜드 선택 · 이마트 내 상품과 전문점 행사는 다를 수 있습니다' },
  { id: 'homeplus', name: '홈플러스', type: '마트', color: '#c52528', url: 'https://my.homeplus.co.kr/leaflet', note: '다른 매장 전단 보기에서 방문 점포 선택 · 상품별 행사일 확인' },
] as const;
export type RetailerId = typeof RETAILERS[number]['id'];
export type Observation = { checkedAt: string; revision: string; name?: string; barcode?: string | null; unitPrice: number | null; buyQuantity: number | null; giftQuantity: number | null; promotion: string; priceKind?: 'promotion' | 'reference' | null; startDate: string | null; endDate: string | null };
export type RetailOffer = Observation & { id: string; sourceId: string; retailer: RetailerId; kind: 'product' | 'event'; name: string; category: string; sourceUrl: string; imageUrl?: string | null; merchantOriginalPrice?: number | null; conditions: string[]; scope: string; priceLabel?: string; firstSeenAt: string; lastSeenAt: string; history: Observation[] };
// Only URLs actually observed in the merchant's product listing are stored.
// Never derive a filename from a barcode, accept arbitrary hosts, or proxy it.
export function retailImageUrl(o: Pick<RetailOffer, 'retailer' | 'imageUrl'>) {
  if (typeof o.imageUrl !== 'string') return null;
  const pattern = o.retailer === 'cu' ? /^https:\/\/tqklhszfkvzk6518638\.edge\.naverncp\.com\/product\/\d{13}(?:_\d+)?\.(?:png|jpg|jpeg)$/
    : o.retailer === 'homeplus' ? /^https:\/\/image\.homeplus\.kr\/it\/\d+[a-zA-Z0-9]*$/ : null;
  return pattern?.test(o.imageUrl) ? o.imageUrl : null;
}
export type RetailCatalog = { schemaVersion: 1; checkedAt: string; sources: Record<string, { status: string; checkedAt?: string; attemptedAt?: string; count?: number; coverage?:string; paginationComplete?:boolean; discovered?:number; notConfirmed?:number; reason?:string; policyCheckedAt?:string; nextEligibleAt?:string }>; offers: RetailOffer[] };
export const retailer = (id: string) => RETAILERS.find(r => r.id === id)!;
export function merchantSavings(o: RetailOffer & { merchantOriginalPrice?: number | null }) {
  const original = o.merchantOriginalPrice;
  if (o.retailer !== 'homeplus' || o.priceKind === 'reference' || o.giftQuantity !== 0 || o.buyQuantity !== 1 || !Number.isSafeInteger(original) || !original || !o.unitPrice || original <= o.unitPrice) return null;
  return { original, amount: original - o.unitPrice };
}
export function preserveObservedImage(o: RetailOffer, saved?: RetailOffer): RetailOffer {
  // Older in-flight collectors did not include this optional field. Preserve
  // the observed photo only for an unchanged product/pack/period/price.
  if (!saved) return o;
  const keys = ['id','retailer','name','barcode','unitPrice','buyQuantity','giftQuantity','startDate','endDate','sourceUrl'] as const;
  if (!keys.every(k => o[k] === saved[k])) return o;
  return { ...o,
    ...(o.imageUrl === undefined && retailImageUrl(saved) ? { imageUrl: saved.imageUrl } : {}),
    ...(o.merchantOriginalPrice === undefined && merchantSavings(saved) ? { merchantOriginalPrice: saved.merchantOriginalPrice,
      conditions: o.conditions.filter(c => !c.includes('비교 수치에서 제외')).concat('판매처 표시 기준가·할인액은 전단 표시이며 실제 관측한 가격 이력과 구분합니다') } : {}) };
}
export const isPublishableRetailOffer = (o: RetailOffer) => !(o.id === 'homeplus-2645' && o.startDate === '2026-10-15' && o.endDate === '2026-10-21'); // Digital/printed original price conflict under review; preserve raw history.
const priceFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
const checkedFormatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
export const money = (amount: number) => priceFormatter.format(amount) + '원';
export const kstDay = (time: number = Date.now()) => new Date(time + 9 * 3600000).toISOString().slice(0, 10);
export function checkedDate(time: string) {
  return Number.isFinite(Date.parse(time)) ? checkedFormatter.format(new Date(time)) + ' KST' : '확인시각 없음';
}
export function offerStatus(o: RetailOffer, now = Date.now()): 'current' | 'upcoming' | 'ended' | 'old' {
  const day = kstDay(now);
  if (o.endDate && o.endDate < day) return 'ended';
  if (o.startDate && o.startDate > day) return 'upcoming';
  const age = now - Date.parse(o.lastSeenAt);
  return age >= -60000 && age <= 48 * 3600000 ? 'current' : 'old';
}
export function bundlePrice(o: Pick<Observation, 'unitPrice' | 'buyQuantity' | 'giftQuantity'>) {
  if (!Number.isSafeInteger(o.unitPrice) || !o.unitPrice || o.unitPrice < 1 || !Number.isSafeInteger(o.buyQuantity) || !o.buyQuantity || o.buyQuantity < 1 || !Number.isSafeInteger(o.giftQuantity) || o.giftQuantity === null || o.giftQuantity < 0) return null;
  const total = o.unitPrice * o.buyQuantity;
  const quantity = o.buyQuantity + o.giftQuantity;
  return { total, quantity, each: total / quantity };
}
export const canAddToShopping = (o: RetailOffer, now = Date.now()) => o.priceKind !== 'reference' && offerStatus(o, now) === 'current' && !!bundlePrice(o);
// An old SKU reused for a different product must not create a false price change.
export function comparableHistory(o: RetailOffer) {
  return o.history.filter(h => (h.priceKind ?? 'promotion') === (o.priceKind ?? 'promotion') && h.name === o.name && (!o.barcode || h.barcode === o.barcode) && bundlePrice(h));
}
export function previousPrice(o: RetailOffer) {
  const current = bundlePrice(o);
  if (!current) return null;
  const prior = comparableHistory(o).slice(0, -1).reverse().find(h => {
    const p = bundlePrice(h)!;
    return p.each !== current.each || h.promotion !== o.promotion;
  });
  return prior ? { observation: prior, price: bundlePrice(prior)! } : null;
}
export const periodText = (o: RetailOffer) => o.priceKind === 'reference' ? '참고가격 · 할인 기간 미확인' : o.startDate && o.endDate ? `${o.startDate} ~ ${o.endDate}` : '종료일 원문 확인';
export type RetailFilters = { q: string; brand: string; type: string; period: string; promo: string; category: string; priceKind: string };
export const EMPTY_FILTERS: RetailFilters = { q: '', brand: '', type: '', period: 'current', promo: '', category: '', priceKind: '' };
export function readFilters(params: URLSearchParams): RetailFilters {
  return { priceKind: ['promotion','reference'].includes(params.get('priceKind') || '') ? params.get('priceKind')! : '', q: (params.get('q') || '').slice(0, 80), brand: RETAILERS.some(r => r.id === params.get('brand')) ? params.get('brand')! : '', type: ['마트', '편의점', '창고형'].includes(params.get('type') || '') ? params.get('type')! : '', period: ['current', 'week', 'upcoming', 'ended', 'all'].includes(params.get('period') || '') ? params.get('period')! : 'current', promo: ['1+1', '2+1', '멤버특가', '전단가', '공식행사가', '공식발표가', '점포조회가', '행사 안내'].includes(params.get('promo') || '') ? params.get('promo')! : '', category: ['음료', '생활용품', '과자·디저트', '식품·기타', '행사 안내'].includes(params.get('category') || '') ? params.get('category')! : '' };
}
export function filterOffers(offers: RetailOffer[], f: RetailFilters, now = Date.now()) {
  const day = kstDay(now), week = kstDay(now + 6 * 86400000);
  return offers.filter(o => {
    const state = offerStatus(o, now);
    return (!f.priceKind || (o.priceKind ?? 'promotion') === f.priceKind) && (!f.q || o.name.toLocaleLowerCase().includes(f.q.toLocaleLowerCase())) && (!f.brand || o.retailer === f.brand) && (!f.type || retailer(o.retailer).type === f.type) && (!f.promo || o.promotion === f.promo) && (!f.category || o.category === f.category) &&
      (f.period === 'all' || f.period === 'current' && state === 'current' || f.period === 'upcoming' && state === 'upcoming' || f.period === 'ended' && state === 'ended' || f.period === 'week' && state === 'current' && !!o.endDate && o.endDate >= day && o.endDate <= week);
  });
}
const dateOnly = (v: unknown) => v === null || typeof v === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(v) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
export function validCatalog(value: unknown, now = Date.now()): value is RetailCatalog {
  if (!value || typeof value !== 'object') return false;
  const c = value as RetailCatalog;
  if (c.schemaVersion !== 1 || !Array.isArray(c.offers) || !c.sources || !Number.isFinite(Date.parse(c.checkedAt)) || Date.parse(c.checkedAt) > now + 60000 || c.offers.length > 10000) return false;
  const ids = new Set<string>();
  return c.offers.every(o => {
    try {
      const host = new URL(o.sourceUrl);
      const allowed = o.retailer === 'cu' ? 'cu.bgfretail.com' : o.retailer === 'lotte' ? 'company.lottemart.com' : o.retailer === 'homeplus' ? 'my.homeplus.co.kr' : ['emart','nobrand','traders'].includes(o.retailer) ? 'www.shinsegaegroupnewsroom.com' : '';
      if (host.protocol !== 'https:' || host.hostname !== allowed || host.username || host.password || !/^(cu|lotte|homeplus|emart|nobrand|traders)-\d+$/.test(o.id) || !o.id.startsWith(o.retailer + '-') || ids.has(o.id)) return false;
      ids.add(o.id);
      return typeof o.name === 'string' && o.name.length > 1 && o.name.length < 300 && ['product', 'event'].includes(o.kind) && typeof o.category === 'string' && typeof o.promotion === 'string' && typeof o.scope === 'string' && (o.priceKind == null || ['promotion','reference'].includes(o.priceKind)) && Array.isArray(o.conditions) && o.conditions.every(v => typeof v === 'string') && dateOnly(o.startDate) && dateOnly(o.endDate) && (!o.startDate || !o.endDate || o.startDate <= o.endDate) && [o.firstSeenAt, o.lastSeenAt].every(v => Number.isFinite(Date.parse(v)) && Date.parse(v) <= now + 60000) && (o.kind !== 'product' || !!bundlePrice(o)) && Array.isArray(o.history) && o.history.length <= 180 && o.history.every(h => Number.isFinite(Date.parse(h.checkedAt)) && Date.parse(h.checkedAt) <= now + 60000 && typeof h.revision === 'string' && typeof h.promotion === 'string' && (o.kind !== 'product' || !!bundlePrice(h)));
    } catch { return false; }
  });
}
export type RetailPreferences = { favorites: string[]; brands: string[]; cart: Record<string, number>; lastVisit: string | null };
export const RETAIL_STORAGE = 'dropped-retail-v1';
export const emptyPreferences = (): RetailPreferences => ({ favorites: [], brands: [], cart: {}, lastVisit: null });
export function parsePreferences(raw: string | null): RetailPreferences {
  try {
    const v = JSON.parse(raw || '{}');
    const ids = (a: unknown) => Array.isArray(a) ? [...new Set(a.filter(x => typeof x === 'string' && /^(cu|lotte|homeplus|emart|nobrand|traders)-\d+$/.test(x)))].slice(0, 500) as string[] : [];
    return { favorites: ids(v.favorites), brands: Array.isArray(v.brands) ? RETAILERS.filter(r => v.brands.includes(r.id)).map(r => r.id) : [], cart: Object.fromEntries(Object.entries(v.cart || {}).filter(([id, n]) => /^(cu|lotte|homeplus|emart|nobrand|traders)-\d+$/.test(id) && Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 50).slice(0, 200)) as Record<string, number>, lastVisit: typeof v.lastVisit === 'string' && Number.isFinite(Date.parse(v.lastVisit)) && Date.parse(v.lastVisit) <= Date.now() ? v.lastVisit : null };
  } catch { return emptyPreferences(); }
}

/** Editorial discovery rule, not a Google minimum-content requirement. */
export function isDiscoverableRetailOffer(o: RetailOffer, now = Date.now()) {
  if (!isPublishableRetailOffer(o) || o.kind !== 'product' || o.priceKind === 'reference' || offerStatus(o, now) !== 'current' || !bundlePrice(o)) return false;
  if (!o.name.trim() || !o.scope.trim() || !o.conditions.some(c => c.trim()) || !Number.isFinite(Date.parse(o.lastSeenAt))) return false;
  try {
    const u = new URL(o.sourceUrl);
    const allowed: Partial<Record<RetailerId, string[]>> = {
      cu: ['cu.bgfretail.com'], homeplus: ['my.homeplus.co.kr'],
      emart: ['emartapp.emart.com', 'www.shinsegaegroupnewsroom.com'],
      nobrand: ['www.shinsegaegroupnewsroom.com'], traders: ['www.shinsegaegroupnewsroom.com'],
    };
    if (u.protocol !== 'https:' || u.username || u.password || !allowed[o.retailer]?.includes(u.hostname)) return false;
  } catch { return false; }
  // A dated promotion or a comparable price change gives the detail a useful
  // decision beyond a single listing. Unknown end dates are never invented.
  return Boolean(o.startDate && o.endDate && /^\d{4}-\d{2}-\d{2}$/.test(o.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(o.endDate) && o.startDate <= o.endDate) || Boolean(previousPrice(o));
}
