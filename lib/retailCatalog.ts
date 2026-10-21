import snapshot from '@/data/retail-promotions.json';
import { isPublishableRetailOffer, preserveObservedImage, validCatalog, type RetailCatalog } from './retail';

const FEED = 'https://raw.githubusercontent.com/jmh7739/dropped/main/marketbot-data/retail-promotions.json';
const storedSnapshot: unknown = snapshot;
const publishable = (c: RetailCatalog): RetailCatalog => {
  const savedOffers = validCatalog(storedSnapshot) ? storedSnapshot.offers : [];
  return { ...c, offers: c.offers.filter(isPublishableRetailOffer).map(o => preserveObservedImage(o, savedOffers.find(saved => saved.id === o.id))) };
};
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
