type Row = Record<string, unknown>;
const FEED = 'https://raw.githubusercontent.com/jmh7739/dropped/main/marketbot-data/public-feed.json';

export function referenceId(row: Row) {
  return [row.exmn_ymd, row.se_cd, row.item_cd, row.vrty_cd, row.grd_cd, row.mrkt_cd].map(String).join(':');
}

export async function publicMarketPrices(): Promise<Row[] | null> {
  try {
    const response = await fetch(FEED, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } });
    if (!response.ok) return null;
    const root = await response.json() as { marketPrices?: { checkedAt?: string; items?: Row[] } };
    const group = root.marketPrices;
    const checked = Date.parse(group?.checkedAt || '');
    if (!Number.isFinite(checked) || checked > Date.now() + 60_000 ||
        Date.now() - checked > 48 * 3600_000 || !Array.isArray(group?.items)) return null;
    const rows = group.items.filter(row => /^20\d{6}$/.test(String(row.exmn_ymd || '')) &&
      String(row.item_nm || '').trim() && Number(row.exmn_dd_prc) > 0 &&
      String(row.se_nm || '').trim() && String(row.unit || '').trim());
    return rows.length ? rows.sort((a, b) => String(b.exmn_ymd).localeCompare(String(a.exmn_ymd))) : null;
  } catch { return null; }
}
