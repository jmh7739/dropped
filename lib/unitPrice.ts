export function deriveUnitPrice(title: string, currentPrice: number, _stored?: string | null): string | null {
  if (!title || !Number.isFinite(currentPrice) || currentPrice <= 0) return null;
  // A Korean suffix is not an ASCII word boundary. Never guess the quantity
  // from just one bottle when the title represents a bundle or option list.
  const normalized = title.normalize("NFKC");
  if (/(?:택\s*\d|선택|옵션|랜덤|증정|\d\s*\+\s*\d|~)/i.test(normalized)) return null;
  const volumes = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(ml|리터|l)(?![a-z])/gi)];
  const counts = [...normalized.matchAll(/(\d+)\s*(?:개입|개|병|팩|입|펫|캔)(?![가-힣\d])/g)];
  if (volumes.length !== 1 || counts.length > 1) return null;
  const volume = volumes[0];
  const amount = Number(volume[1]);
  const liters = /ml/i.test(volume[2]) ? amount / 1000 : amount;
  const multiplier = normalized.match(/(?:ml|리터|l)\s*[x×*]\s*(\d+)(?!\d)/i);
  if (/[x×*]/i.test(normalized) && !multiplier) return null;
  if (multiplier && counts.length && Number(multiplier[1]) !== Number(counts[0][1])) return null;
  if (!counts.length && !multiplier && /묶음|세트|박스|[x×*]/i.test(normalized)) return null;
  const units = Number(counts[0]?.[1] ?? multiplier?.[1] ?? 1);
  if (!Number.isSafeInteger(units) || units < 1) return null;
  const totalLiters = liters * units;
  if (!Number.isFinite(totalLiters) || totalLiters <= 0) return null;
  return `1L당 ${Math.round(currentPrice / totalLiters).toLocaleString("ko-KR")}원`;
}
