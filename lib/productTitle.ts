/** Keep the seller's full title in the record, but use a readable label in search and headings. */
export function productDisplayTitle(title: string, maxLength = 68): string {
  const normalized = title.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const words = normalized.slice(0, maxLength + 1);
  const cut = words.lastIndexOf(' ');
  return `${words.slice(0, cut >= 32 ? cut : maxLength).trim()}…`;
}

const LEADING_PROMO = /^(?:(?:\[[^\]]{0,40}\]|【[^】]{0,40}】|\([^)]{0,30}\))\s*|(?:20\d{2}|new|brand\s+new|newest|latest|hot(?:\s+sale)?|sale|original|genuine|official|upgraded?|free\s+shipping|best|top|premium|high\s+quality)\b[\s,!/+|-]*)+/i;

/**
 * Seller titles (especially AliExpress) often start with promo words such as
 * "2026 New Hot Sale [Free Shipping]". Move those to the end so the product name comes first.
 * Nothing is removed: the promo words stay, just after the name.
 */
export function leadWithProductName(title: string): string {
  const normalized = title.replace(/\s+/g, ' ').trim();
  const match = normalized.match(LEADING_PROMO);
  if (!match || !match[0].trim()) return normalized;
  const rest = normalized.slice(match[0].length).trim();
  if (rest.length < 6) return normalized;
  const promo = match[0].replace(/[\s,!/+|-]+$/, '').trim();
  return `${rest} · ${promo}`;
}
