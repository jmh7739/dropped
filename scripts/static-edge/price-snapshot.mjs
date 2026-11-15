// Builds the static price snapshot (dist/client/snapshot/) used by /price pages,
// the sitemap and the home fallback.
//  1. Loads the snapshot the live site already serves (no database egress).
//  2. Adds only price rows newer than that snapshot from Supabase (incremental).
//  3. If the database cannot be read, keeps the previous snapshot unchanged so
//     pages still render with their 기준 시각.
// Usage: node scripts/static-edge/price-snapshot.mjs [outDir]
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (optional), SNAPSHOT_SOURCE (default https://dropped.kr)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const VERSION = 1;
const KEEP_DAYS = 365;
let outDir = path.resolve(process.argv[2] ?? "dist/client/snapshot");
const source = process.env.SNAPSHOT_SOURCE ?? "https://dropped.kr";
let dbUrl = process.env.SUPABASE_URL;
let dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let egressBytes = 0;

export async function loadPrevious() {
  try {
    const res = await fetch(`${source}/snapshot/all.json`, { signal: AbortSignal.timeout(60000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.version === VERSION && data.products) return data;
    }
  } catch (error) { console.warn("previous snapshot unavailable:", String(error)); }
  const bootstrap = JSON.parse(fs.readFileSync("data/price-known-ids.json", "utf8"));
  return { version: VERSION, generatedAt: null, products: {}, knownIds: bootstrap.ids, metaRefreshedAt: null };
}

async function rest(pathAndQuery) {
  const res = await fetch(`${dbUrl}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  egressBytes += text.length;
  if (!res.ok) throw new Error(`database ${res.status}: ${text.slice(0, 160)}`);
  return JSON.parse(text);
}

async function paged(base) {
  const out = [];
  for (let offset = 0; offset < 50000; offset += 1000) {
    const rows = await rest(`${base}&limit=1000&offset=${offset}`);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const chunks = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

export async function refresh(prev) {
  const now = new Date();
  const active = new Set((await paged("v_active_deals?select=product_id&status=eq.active")).map((r) => Number(r.product_id)));
  const popular = (await paged("products?select=id&platform=eq.cps&external_product_id=like.pp_*")).map((r) => Number(r.id));
  const prevIds = Object.keys(prev.products).map(Number);
  const candidates = [...new Set([...active, ...popular, ...prevIds, ...prev.knownIds])].filter((id) => Number.isSafeInteger(id) && id > 0);
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
  for (const chunk of chunks(ids, 150)) {
    for (const s of await rest(`deal_stats?select=product_id,like_count&product_id=in.(${chunk.join(",")})`)) {
      if (products[s.product_id]) products[s.product_id].likeCount = s.like_count ?? 0;
    }
  }
  // Only rows newer than the previous snapshot (with a 2-hour overlap) for known products.
  const since = prev.generatedAt ? new Date(Date.parse(prev.generatedAt) - 2 * 3600_000) : null;
  const fullSince = new Date(now - KEEP_DAYS * 86400_000);
  const groups = [
    [ids.filter((id) => !newIds.includes(id) && since), since],
    [ids.filter((id) => newIds.includes(id) || !since), fullSince],
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
    const seen = new Set();
    p.history = p.history.filter(([t, price]) => t >= keepFrom && !seen.has(`${t}:${price}`) && seen.add(`${t}:${price}`)).sort((a, b) => a[0] - b[0]);
  }
  const knownIds = candidates.filter((id) => !products[id]);
  return { version: VERSION, generatedAt: now.toISOString(), products, knownIds, metaRefreshedAt: metaStale ? now.toISOString() : prev.metaRefreshedAt };
}

export function write(snap) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, "p"), { recursive: true });
  const index = { version: VERSION, generatedAt: snap.generatedAt, knownIds: snap.knownIds, products: {} };
  for (const p of Object.values(snap.products)) {
    fs.writeFileSync(path.join(outDir, "p", `${p.id}.json`), JSON.stringify(p));
    const last = p.history.at(-1), first = p.history[0];
    index.products[p.id] = {
      title: p.title, platform: p.platform, mallName: p.mallName, imageUrl: p.imageUrl,
      categorySlug: p.categorySlug, categoryName: p.categoryName, hasActiveDeal: p.hasActiveDeal,
      current: last ? last[1] : null,
      lastCheckedAt: last ? new Date(last[0] * 1000).toISOString() : null,
      firstCheckedAt: first ? new Date(first[0] * 1000).toISOString() : null,
      points: p.history.length,
    };
  }
  fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index));
  fs.writeFileSync(path.join(outDir, "all.json"), JSON.stringify(snap));
}

export function configure(opts) { ({ outDir = outDir, dbUrl = dbUrl, dbKey = dbKey } = opts); egressBytes = 0; }
export const usage = () => egressBytes;

export async function main() {
  const prev = await loadPrevious();
  let snap = prev;
  if (dbUrl && dbKey) {
    try { snap = await refresh(prev); }
    catch (error) { console.warn("database refresh failed; keeping previous snapshot:", String(error).slice(0, 200)); }
  } else {
    console.warn("no database credentials; keeping previous snapshot");
  }
  write(snap);
  console.log(JSON.stringify({ generatedAt: snap.generatedAt, products: Object.keys(snap.products).length, knownWithoutData: snap.knownIds.length, databaseBytes: egressBytes }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
