import type { PricePoint } from "./types";

/**
 * 마지막으로 정상 수집한 상품 가격 기록의 정적 사본.
 * 빌드가 dist/client/snapshot/ 에 쓰고(scripts/static-edge/price-snapshot.mjs), 배포된 사이트의
 * 정적 파일로 남는다. 다음 빌드는 이 사본에 새 기록만 더하므로 DB에서 전체 이력을 다시 받지 않고,
 * DB를 읽을 수 없을 때도 페이지를 '기준 시각'과 함께 보여 줄 수 있다.
 */
export const SNAPSHOT_VERSION = 1;

export type SnapshotProduct = {
  id: number;
  platform: string;
  title: string;
  imageUrl: string;
  productUrl: string;
  affiliateUrl: string;
  listPrice: number;
  mallName: string | null;
  shippingFee: number | null;
  unitPrice: string | null;
  categorySlug: string;
  categoryName: string;
  hasActiveDeal: boolean;
  likeCount: number;
  /** [epoch seconds, price] 오름차순. 최근 365일만 보관. */
  history: [number, number][];
};

export type SnapshotIndexEntry = {
  title: string;
  platform: string;
  mallName: string | null;
  imageUrl: string;
  categorySlug: string;
  categoryName: string;
  hasActiveDeal: boolean;
  current: number | null;
  lastCheckedAt: string | null;
  firstCheckedAt: string | null;
  points: number;
};

export type SnapshotIndex = {
  version: number;
  generatedAt: string;
  products: Record<string, SnapshotIndexEntry>;
  /** 과거 sitemap에 실렸지만 아직 사본이 없는 상품 번호(있는 상품이므로 404가 아니라 503). */
  knownIds: number[];
};

export const toPricePoints = (h: [number, number][]): PricePoint[] =>
  h.map(([t, price]) => ({ price, collectedAt: new Date(t * 1000).toISOString() }));

type AssetFetcher = { fetch: (input: string) => Promise<Response> };
let assets: AssetFetcher | null | undefined;

async function assetBinding(): Promise<AssetFetcher | null> {
  if (assets !== undefined) return assets;
  try {
    const name = "cloudflare:workers";
    const mod = await import(/* @vite-ignore */ name);
    assets = (mod.env?.ASSETS as AssetFetcher | undefined) ?? null;
  } catch {
    assets = null;
  }
  return assets;
}

async function readJson<T>(path: string): Promise<T | null> {
  const binding = await assetBinding();
  if (!binding) return null;
  try {
    const res = await binding.fetch(`https://assets.local${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

let indexMemo: { at: number; value: SnapshotIndex | null } | null = null;
const productMemo = new Map<number, SnapshotProduct | null>();

export async function getSnapshotIndex(): Promise<SnapshotIndex | null> {
  if (indexMemo && Date.now() - indexMemo.at < 10 * 60_000) return indexMemo.value;
  const value = await readJson<SnapshotIndex>("/snapshot/index.json");
  const ok = value && value.version === SNAPSHOT_VERSION && value.products ? value : null;
  indexMemo = { at: Date.now(), value: ok };
  return ok;
}

export async function getSnapshotProduct(id: number): Promise<SnapshotProduct | null> {
  if (productMemo.has(id)) return productMemo.get(id)!;
  const value = await readJson<SnapshotProduct>(`/snapshot/p/${id}.json`);
  const ok = value && value.id === id && Array.isArray(value.history) ? value : null;
  if (productMemo.size > 200) productMemo.clear();
  productMemo.set(id, ok);
  return ok;
}

/** 사본이 있거나 과거에 공개된 적 있는 상품인지. */
export function isKnownProduct(index: SnapshotIndex | null, id: number): boolean {
  return !!index && (String(id) in index.products || index.knownIds.includes(id));
}

export function formatSnapshotTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
