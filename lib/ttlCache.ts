/**
 * Keeps finished results in this isolate for a short time.
 * Pending promises are never shared because Workers cannot await I/O started by another request.
 */
const MAX_ENTRIES = 100;
const entries = new Map<string, { expires: number; value: unknown }>();

export async function withTtlCache<T>(key: string, ttlMs: number, load: () => Promise<T>, now: () => number = Date.now): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.expires > now()) return hit.value as T;
  const value = await load();
  if (entries.size >= MAX_ENTRIES) entries.clear();
  entries.set(key, { expires: now() + ttlMs, value });
  return value;
}

export function clearTtlCache(): void {
  entries.clear();
}
