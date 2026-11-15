import { RETAILERS, filterOffers, offerStatus, readFilters, type RetailCatalog, type RetailFilters, type RetailOffer } from './retail';
import { coverageNote } from './retail-coverage';

export const RETAIL_PAGE_SIZE = 36;
const HISTORY_KEEP = 8;

export type RetailPageData = {
  offers: RetailOffer[];
  filters: RetailFilters;
  total: number;
  productCount: number;
  eventCount: number;
  page: number;
  pageCount: number;
  current: { product: number; reference: number; byRetailer: Record<string, number>; retailers: string[] };
  coverage: string | null;
  checkedAt: string;
};

/** Keeps the fields a card needs and only the latest history entries. */
export function slimOffer(o: RetailOffer): RetailOffer {
  return { ...o, history: o.history.slice(-HISTORY_KEEP) };
}

/** Alternates retailers so one brand does not fill the first screen. */
export function interleaveByRetailer(offers: RetailOffer[]) {
  const groups = RETAILERS.map(r => offers.filter(o => o.retailer === r.id));
  const longest = Math.max(0, ...groups.map(g => g.length));
  const out: RetailOffer[] = [];
  for (let i = 0; i < longest; i++) for (const g of groups) if (g[i]) out.push(g[i]);
  return out;
}

export function buildRetailPage(catalog: RetailCatalog, params: URLSearchParams, now = Date.now()): RetailPageData {
  const filters = readFilters(params);
  const matched = interleaveByRetailer(filterOffers(catalog.offers, filters, now));
  const pageCount = Math.max(1, Math.ceil(matched.length / RETAIL_PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, parseInt(params.get('page') || '1', 10) || 1));
  const current = catalog.offers.filter(o => offerStatus(o, now) === 'current');
  const byRetailer: Record<string, number> = {};
  for (const o of current) if (o.kind === 'product') byRetailer[o.retailer] = (byRetailer[o.retailer] ?? 0) + 1;
  return {
    offers: matched.slice((page - 1) * RETAIL_PAGE_SIZE, page * RETAIL_PAGE_SIZE).map(slimOffer),
    filters,
    total: matched.length,
    productCount: matched.filter(o => o.kind === 'product').length,
    eventCount: matched.filter(o => o.kind === 'event').length,
    page,
    pageCount,
    current: {
      product: current.filter(o => o.kind === 'product' && o.priceKind !== 'reference').length,
      reference: current.filter(o => o.priceKind === 'reference').length,
      byRetailer,
      retailers: [...new Set(current.map(o => o.retailer))],
    },
    coverage: filters.brand ? coverageNote(catalog, filters.brand) : null,
    checkedAt: catalog.checkedAt,
  };
}

/** URL for a filter set and page; the default period and first page are omitted. */
export function retailHref(filters: RetailFilters, page = 1) {
  const search = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => { if (val && !(key === 'period' && val === 'current')) search.set(key, val); });
  if (page > 1) search.set('page', String(page));
  const qs = search.toString();
  return '/store-deals' + (qs ? '?' + qs : '');
}
