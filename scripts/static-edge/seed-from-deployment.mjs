// Rebuilds a price snapshot seed from the stored /price/<id> pages of an earlier
// Cloudflare deployment (its version preview address). Used once when the live
// snapshot is empty and the database cannot be read; it sends no database request.
// Usage: node scripts/static-edge/seed-from-deployment.mjs <version-host> [<fallback-host> ...]
//   e.g. node scripts/static-edge/seed-from-deployment.mjs eabdba3c-hotdeal-curation.jmh7739.workers.dev
// Writes data/price-snapshot-seed.json.gz (snapshot format, see lib/priceSnapshot.ts).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";

const VERSION = 1;

/** Decodes the RSC payload that vinext inlines as one `.rsc.push("...")` string. */
export function rscRows(html) {
  const m = html.match(/\.rsc\.push\(("(?:[^"\\]|\\.)*")\)/);
  if (!m) return new Map();
  const buf = Buffer.from(JSON.parse(m[1]), "utf8");
  const rows = new Map();
  let i = 0;
  while (i < buf.length) {
    const colon = buf.indexOf(0x3a, i);
    if (colon < 0) break;
    const id = buf.subarray(i, colon).toString("utf8");
    if (buf[colon + 1] === 0x54) { // T<hex length>,<text>
      const comma = buf.indexOf(0x2c, colon);
      const len = parseInt(buf.subarray(colon + 2, comma).toString("utf8"), 16);
      rows.set(id, buf.subarray(comma + 1, comma + 1 + len).toString("utf8"));
      i = comma + 1 + len;
      continue;
    }
    const nl = buf.indexOf(0x0a, colon);
    const end = nl < 0 ? buf.length : nl;
    const raw = buf.subarray(colon + 1, end).toString("utf8");
    if (!raw.startsWith("I")) { try { rows.set(id, JSON.parse(raw)); } catch { /* not JSON */ } }
    i = end + 1;
  }
  return rows;
}

function* walk(node) {
  if (Array.isArray(node)) {
    if (node[0] === "$" && node[3] && typeof node[3] === "object") yield node[3];
    for (const child of node) yield* walk(child);
  } else if (node && typeof node === "object") {
    for (const value of Object.values(node)) yield* walk(value);
  }
}

const platformFor = (url) => /aliexpress/i.test(url) ? "aliexpress" : /coupang/i.test(url) ? "coupang" : /naver/i.test(url) ? "naver" : "cps";
const PLATFORM_LABEL = { coupang: "쿠팡", aliexpress: "알리익스프레스", cps: "국내몰", naver: "네이버" };

/** Extracts one snapshot product from a stored price page, or null. */
export function productFromPage(id, html) {
  const rows = rscRows(html);
  const ref = (v) => (typeof v === "string" && /^\$[0-9a-f]+$/.test(v) ? rows.get(v.slice(1)) : v);
  let history = null, href = null, image = "", alt = "", likeCount = 0;
  for (const value of rows.values()) {
    for (const props of walk(value)) {
      if (Array.isArray(props.history) && props.history.every((p) => p && typeof p.price === "number")) history ??= props.history;
      if (props.productId === id && typeof props.initialCount === "number") likeCount = props.initialCount;
      if (props.productId === id && props.href && props.children === "판매 페이지로 →") href = ref(props.href);
      if (typeof props.src === "string" && typeof props.alt === "string" && props.alt.endsWith(" 상품 이미지") && !image) { image = props.src; alt = props.alt.slice(0, -" 상품 이미지".length); }
    }
  }
  const lds = [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
  const product = lds.find((d) => d?.["@type"] === "Product");
  const crumbs = lds.find((d) => d?.["@type"] === "BreadcrumbList");
  const categoryUrl = crumbs?.itemListElement?.find((e) => /\/category\//.test(e.item ?? ""));
  // The image alt text is the full product title; older builds had no Product JSON-LD.
  const title = product?.name ?? alt;
  if (!history?.length || !title) return null;
  const affiliateUrl = typeof href === "string" && /^https?:/.test(href) ? href : product?.offers?.url ?? "#";
  const platform = platformFor(affiliateUrl);
  const seller = product?.offers?.seller?.name ?? null;
  const points = history
    .map((p) => [Math.floor(Date.parse(p.collectedAt) / 1000), p.price])
    .filter(([t, price]) => Number.isFinite(t) && price > 0)
    .sort((a, b) => a[0] - b[0]);
  return {
    id, platform, title, imageUrl: image || product?.image?.[0] || "",
    productUrl: affiliateUrl, affiliateUrl, listPrice: 0,
    mallName: seller && seller !== PLATFORM_LABEL[platform] ? seller : null,
    shippingFee: null, unitPrice: null,
    categorySlug: categoryUrl ? categoryUrl.item.split("/category/")[1] : "",
    categoryName: categoryUrl?.name ?? product?.category ?? "기타",
    hasActiveDeal: false, likeCount, history: points,
  };
}

async function fetchPage(host, id) {
  try {
    const res = await fetch(`https://${host}/price/${id}`, { signal: AbortSignal.timeout(60000) });
    // Only pages served from the stored copy carry the data of that build.
    if (res.status !== 200 || res.headers.get("x-dropped-static") !== "1") return null;
    return await res.text();
  } catch { return null; }
}

export async function main(hosts) {
  const known = JSON.parse(fs.readFileSync("data/price-known-ids.json", "utf8")).ids;
  const products = {};
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < known.length) {
      const id = known[next++];
      for (const host of hosts) {
        const html = await fetchPage(host, id);
        const p = html && productFromPage(id, html);
        if (p) { products[id] = { ...p, seededFrom: host }; break; }
      }
    }
  }));
  // Each build has its own newest observation; the oldest of those is the safe point
  // from which the next refresh must add rows (it also overlaps by two hours).
  const newestByHost = {};
  for (const p of Object.values(products)) {
    newestByHost[p.seededFrom] = Math.max(newestByHost[p.seededFrom] ?? 0, p.history.at(-1)?.[0] ?? 0);
    delete p.seededFrom;
  }
  const last = Math.min(...Object.values(newestByHost));
  const snap = {
    version: VERSION,
    // The newest observation in the stored pages; the next refresh adds rows after it (with overlap).
    generatedAt: Number.isFinite(last) && last > 0 ? new Date(last * 1000).toISOString() : null,
    products,
    knownIds: known.filter((id) => !products[id]),
    metaRefreshedAt: null,
    seed: { source: hosts, createdAt: new Date().toISOString() },
  };
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(path.join("data", "price-snapshot-seed.json.gz"), zlib.gzipSync(JSON.stringify(snap), { level: 9 }));
  console.log(JSON.stringify({ products: Object.keys(products).length, missing: snap.knownIds.length, generatedAt: snap.generatedAt }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const hosts = process.argv.slice(2);
  if (!hosts.length) throw new Error("usage: seed-from-deployment.mjs <version-host> [...]");
  await main(hosts);
}
