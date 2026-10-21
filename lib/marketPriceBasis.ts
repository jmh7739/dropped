export function marketPriceBasis(row: Record<string, unknown>) {
  const unit = String(row.unit ?? '').trim();
  const size = String(row.unit_sz ?? '').trim();
  if (!unit || !/^\d+(?:\.\d+)?$/.test(size) || !Number.isFinite(Number(size)) || Number(size) <= 0) return null;
  return { unit, unitSize: size, displayUnit: `${Number(size)}${unit}` };
}
