// Builds the static price snapshot (dist/client/snapshot/) used by /price pages,
// the sitemap, deal lists and the home fallback.
//  1. Loads the newest previous snapshot without database egress: the copy the live
//     site serves (Cloudflare static assets), the preview copy, or the committed seed.
//  2. Adds only price rows newer than that snapshot from Supabase (incremental),
//     selecting just the columns the pages use.
//  3. If the database cannot be read (402 quota, 5xx, timeout), keeps the previous
//     snapshot unchanged so pages still render with their 기준 시각. A refresh can
//     only add products, never drop them, so an outage never publishes an empty copy.
// History is stored at most two points per Korean day (the day's lowest and its last
// observation), which keeps the lowest price and the current price exact.
// Usage: node scripts/static-edge/price-snapshot.mjs [outDir]
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (optional),
//      SNAPSHOT_SOURCES (comma separated, default https://dropped.kr,https://hotdeal-curation.jmh7739.workers.dev)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";

const VERSION = 1;
const KEEP_DAYS = 365;
const SEED = "data/price-snapshot-seed.json.gz";
let outDir = path.resolve(process.argv[2] ?? "dist/client/snapshot");
let sources = (process.env.SNAPSHOT_SOURCES ?? process.env.SNAPSHOT_SOURCE ?? "https://dropped.kr,https://hotdeal-curation.jmh7739.workers.dev")
  .split(",").map((s) => s.trim()).filter(Boolean);
let seedPath = SEED;
let dbUrl = process.env.SUPABASE_URL;
let dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let egressBytes = 0;
let requests = 0;

const usable = (data) => data?.version === VERSION && data.products && typeof data.products === "object";
const count = (data) => Object.keys(data?.products ?? {}).length;
const stamp = (data) => (data?.generatedAt ? Date.parse(data.generatedAt) || 0 : 0);

async function fromUrl(base) {
  try {
    const res = await fetch(`${base}/snapshot/all.json`, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return null;
    const data = await res.json();
    return usable(data) ? data : null;
  } catch (error) {
    console.warn(`previous snapshot unavailable from ${base}:`, String(error).slice(0, 120));
    return null;
  }
}

function fromSeed() {
  try {
    const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(seedPath)).toString("utf8"));
    return usable(data) ? data : null;
  } catch { return null; }
}

/**
 * Picks the newest non-empty previous snapshot and fills in any product that only an
 * older copy still has, so a bad deploy can never shrink the stored history.
 */
export function choosePrevious(copies) {
  const list = copies.filter((c) => usable(c) && count(c) > 0).sort((a, b) => stamp(b) - stamp(a));
  if (!list.length) return null;
  const best = structuredClone(list[0]);
  for (const older of list.slice(1)) {
    for (const [id, p] of Object.entries(older.products)) if (!(id in best.products)) best.products[id] = p;
  }
  const known = new Set(list.flatMap((c) => c.knownIds ?? []));
  best.knownIds = [...known].filter((id) => !(String(id) in best.products));
  return best;
}

export async function loadPrevious() {
  const copies = [...await Promise.all(sources.map(fromUrl)), fromSeed()];
  const best = choosePrevious(copies);
  if (best) return best;
  const bootstrap = JSON.parse(fs.readFileSync("data/price-known-ids.json", "utf8"));
  return { version: VERSION, generatedAt: null, products: {}, knownIds: bootstrap.ids, metaRefreshedAt: null };
}

async function rest(pathAndQuery) {
  requests += 1;
  const res = await fetch(`${dbUrl}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  egressBytes += text.length;
  // The first failure stops the whole refresh (no retries against a blocked project).
  if (!res.ok) throw new Error(`database ${res.status}: ${text.slice(0, 160)}`);
  return JSON.parse(text);
}

async function paged(base) {
  const out = [];
  for (let offset = 0; offset < 200000; offset += 1000) {
    const rows = await rest(`${base}&limit=1000&offset=${offset}`);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
const kstDay = (t) => new Date((t + 9 * 3600) * 1000).toISOString().slice(0, 10);

/** Keeps at most the lowest and the last observation of each Korean day. */
export function downsampleDaily(history) {
  const days = new Map();
  for (const point of history) {
    const [t, price] = point;
    if (!Number.isFinite(t) || !(price > 0)) continue;
    const day = kstDay(t);
    const d = days.get(day);
    if (!d) { days.set(day, { low: point, last: point }); continue; }
    if (price < d.low[1] || (price === d.low[1] && t < d.low[0])) d.low = point;
    if (t >= d.last[0]) d.last = point;
  }
  const out = [];
  for (const { low, last } of days.values()) {
    out.push(low);
    if (last !== low && !(last[0] === low[0] && last[1] === low[1])) out.push(last);
  }
  return out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export async function refresh(prev) {
  const now = new Date();
  // Product ids only (a few bytes per row): active deals, verified affiliate feeds and the newest products.
  const active = new Set((await paged("v_active_deals?select=product_id&status=eq.active")).map((r) => Number(r.product_id)));
  const feeds = (await paged("products?select=id&platform=eq.cps&or=(external_product_id.like.pp_*,external_product_id.like.lp_*)")).map((r) => Number(r.id));
  const recent = (await rest("products?select=id&order=created_at.desc&limit=300")).map((r) => Number(r.id));
  const prevIds = Object.keys(prev.products).map(Number);
  const candidates = [...new Set([...active, ...feeds, ...recent, ...prevIds, ...prev.knownIds])].filter((id) => Number.isSafeInteger(id) && id > 0);
  const newIds = candidates.filter((id) => !(id in prev.products));
  const metaStale = !prev.metaRefreshedAt || now - Date.parse(prev.metaRefreshedAt) > 24 * 3600_000;
  const metaIds = metaStale ? candidates : newIds;
  const products = structuredClone(prev.products);
  const select = "id,platform,title,image_url,product_url,affiliate_url,list_price,mall_name,shipping_fee,unit_price,categories(slug,name)";
  for (const ids of chunks(metaIds, 150)) {
    for (const p of await rest(`products?select=${select}&id=in.(${ids.join(",")})`)) {
      const old = products[p.id];
      products[p.id] = {
        id: p.id, platform: p.platform, title: p.title ?? "", imageUrl: p.image_url ?? "",
        productUrl: p.product_url ?? "#", affiliateUrl: p.affiliate_url ?? p.product_url ?? "#",
        listPrice: p.list_price ?? 0, mallName: p.mall_name ?? null, shippingFee: p.shipping_fee ?? null,
        unitPrice: p.unit_price ?? null, categorySlug: p.categories?.slug ?? "", categoryName: p.categories?.name ?? "기타",
        hasActiveDeal: false, likeCount: old?.likeCount ?? 0, history: old?.history ?? [],
      };
    }
  }
  const ids = Object.keys(products).map(Number);
  if (metaStale) {
    for (const chunk of chunks(ids, 150)) {
      for (const s of await rest(`deal_stats?select=product_id,like_count&product_id=in.(${chunk.join(",")})`)) {
        if (products[s.product_id]) products[s.product_id].likeCount = s.like_count ?? 0;
      }
    }
  }
  // Only rows newer than the previous snapshot (with a 2-hour overlap) for known products;
  // new products get their stored year once.
  const since = prev.generatedAt ? new Date(Date.parse(prev.generatedAt) - 2 * 3600_000) : null;
  const fullSince = new Date(now - KEEP_DAYS * 86400_000);
  const isNew = new Set(newIds);
  const groups = [
    [ids.filter((id) => !isNew.has(id) && since), since],
    [ids.filter((id) => isNew.has(id) || !since), fullSince],
  ];
  for (const [list, from] of groups) {
    for (const chunk of chunks(list, 100)) {
      const rows = await paged(`price_history?select=product_id,price,collected_at&product_id=in.(${chunk.join(",")})&price=gt.0&collected_at=gte.${from.toISOString()}&collected_at=lte.${now.toISOString()}&order=collected_at.asc,id.asc`);
      for (const r of rows) {
        const t = Math.floor(Date.parse(r.collected_at) / 1000);
        if (!Number.isFinite(t) || !(r.price > 0)) continue;
        products[r.product_id]?.history.push([t, r.price]);
      }
    }
  }
  const keepFrom = Math.floor((now - KEEP_DAYS * 86400_000) / 1000);
  for (const p of Object.values(products)) {
    p.hasActiveDeal = active.has(p.id);
    p.history = downsampleDaily(p.history.filter(([t]) => t >= keepFrom));
  }
  // Products without any observation are not worth a page yet; they stay "known".
  for (const [id, p] of Object.entries(products)) if (!p.history.length && !(id in prev.products)) delete products[id];
  const knownIds = candidates.filter((id) => !products[id] && prev.knownIds.includes(id));
  return { version: VERSION, generatedAt: now.toISOString(), products, knownIds, metaRefreshedAt: metaStale ? now.toISOString() : prev.metaRefreshedAt };
}

export function write(snap) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, "p"), { recursive: true });
  const index = { version: VERSION, generatedAt: snap.generatedAt, knownIds: snap.knownIds, products: {} };
  for (const p of Object.values(snap.products)) {
    p.history = downsampleDaily(p.history);
    fs.writeFileSync(path.join(outDir, "p", `${p.id}.json`), JSON.stringify(p));
    const last = p.history.at(-1), first = p.history[0];
    index.products[p.id] = {
      title: p.title, platform: p.platform, mallName: p.mallName, imageUrl: p.imageUrl,
      categorySlug: p.categorySlug, categoryName: p.categoryName, hasActiveDeal: p.hasActiveDeal,
      current: last ? last[1] : null,
      lastCheckedAt: last ? new Date(last[0] * 1000).toISOString() : null,
      firstCheckedAt: first ? new Date(first[0] * 1000).toISOString() : null,
      points: p.history.length,
      observedDays: new Set(p.history.map(([t]) => kstDay(t))).size,
    };
  }
  fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index));
  fs.writeFileSync(path.join(outDir, "all.json"), JSON.stringify(snap));
}

export function configure(opts) {
  ({ outDir = outDir, dbUrl = dbUrl, dbKey = dbKey, sources = sources, seedPath = seedPath } = opts);
  egressBytes = 0;
  requests = 0;
}
export const usage = () => egressBytes;

export async function main() {
  const prev = await loadPrevious();
  let snap = prev;
  let status = "unchanged";
  if (dbUrl && dbKey) {
    try { snap = await refresh(prev); status = "refreshed"; }
    catch (error) { console.warn("database refresh failed; keeping previous snapshot:", String(error).slice(0, 200)); status = "kept-previous"; }
  } else {
    console.warn("no database credentials; keeping previous snapshot");
  }
  // Never replace a snapshot that has products with one that has fewer.
  if (count(snap) < count(prev)) { console.warn("refreshed snapshot is smaller than the previous one; keeping previous"); snap = prev; status = "kept-previous"; }
  write(snap);
  console.log(JSON.stringify({ status, generatedAt: snap.generatedAt, products: count(snap), knownWithoutData: snap.knownIds.length, databaseRequests: requests, databaseBytes: egressBytes }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
