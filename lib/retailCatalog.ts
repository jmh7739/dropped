import snapshot from '@/data/retail-promotions.json';
import { isPublishableRetailOffer, validCatalog, type RetailCatalog } from './retail';

const FEED = 'https://raw.githubusercontent.com/jmh7739/dropped/main/marketbot-data/retail-promotions.json';
const publishable = (c: RetailCatalog): RetailCatalog => ({ ...c, offers: c.offers.filter(isPublishableRetailOffer) });
export async function getRetailCatalog(): Promise<{ catalog: RetailCatalog; usingSaved: boolean }> {
  try {
    const response = await fetch(FEED, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(6000) });
    if (response.ok) {
      const catalog: unknown = await response.json();
      if (validCatalog(catalog) && Date.parse(catalog.checkedAt) >= Date.parse(snapshot.checkedAt)) return { catalog: publishable(catalog), usingSaved: false };
    }
  } catch { /* Keep the dated, verified snapshot; never invent fresh data. */ }
  if (!validCatalog(snapshot)) throw new Error('Retail snapshot failed validation');
  return { catalog: publishable(snapshot as RetailCatalog), usingSaved: true };
}
