/** Keep the seller's full title in the record, but use a readable label in search and headings. */
export function productDisplayTitle(title: string, maxLength = 68): string {
  const normalized = title.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const words = normalized.slice(0, maxLength + 1);
  const cut = words.lastIndexOf(' ');
  return `${words.slice(0, cut >= 32 ? cut : maxLength).trim()}…`;
}
