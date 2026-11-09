// Renders the public pages from the built app (served by `wrangler dev`) into
// dist/client/__static, then writes dist/server/edge-wrangler.json for deployment.
// Usage: SITE_HOST=example.kr node scripts/static-edge/prerender.mjs <base-url> [max-pages]
// PARAM_LIMITS (optional JSON) caps query parameters per path prefix, e.g. {"/store-deals":1}.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:8799";
const maxPages = Number(process.argv[3] ?? 2000);
const outDir = path.resolve("dist/client/__static");
// Files with any extension other than xml/txt are served as plain static assets.
const SKIP = /^\/(api|go|_next|__static)(\/|$)|\.(?!(xml|txt)$)[a-z0-9]{2,5}$/i;
const WORKERS = 4;
const siteHost = process.env.SITE_HOST;
if (!siteHost) throw new Error("SITE_HOST is required");
const paramLimits = JSON.parse(process.env.PARAM_LIMITS || "{}");

const normalize = (raw) => {
  const url = new URL(raw, base);
  if (url.origin !== base && url.hostname !== siteHost && url.hostname !== `www.${siteHost}`) return null;
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/$/, "") : url.pathname;
  if (SKIP.test(pathname)) return null;
  // Filter combinations multiply quickly; anything skipped here still renders on demand.
  const prefix = Object.keys(paramLimits).find((p) => pathname.startsWith(p));
  const paramLimit = prefix ? paramLimits[prefix] : 2;
  if ([...url.searchParams.keys()].length > paramLimit) return null;
  url.searchParams.sort();
  const query = url.searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
};

const fileFor = (key) => {
  const pathname = key.split("?")[0];
  const ext = /\.(xml|txt)$/.exec(pathname)?.[0] ?? ".html";
  return `${createHash("sha1").update(key).digest("hex")}${ext}`;
};

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const seen = new Set();
const queue = [];
const add = (raw) => {
  let key;
  try { key = normalize(raw); } catch { return; }
  if (key && !seen.has(key) && seen.size < maxPages) { seen.add(key); queue.push(key); }
};

const results = new Map();

const render = async (key, timeoutMs) => {
  try {
    const res = await fetch(base + key, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
    const body = Buffer.from(await res.arrayBuffer());
    const text = body.toString("utf8");
    // The local server can answer 200 with an empty or cut-off body under load.
    const isHtml = fileFor(key).endsWith(".html");
    const complete = isHtml ? text.includes("</html>") : text.trim().length > 0;
    if (res.status === 200 && !complete) {
      results.set(key, { key, status: 0, bytes: body.length, error: "incomplete body" });
      return;
    }
    results.set(key, { key, status: res.status, bytes: body.length });
    if (res.status === 200) {
      fs.writeFileSync(path.join(outDir, fileFor(key)), body);
      for (const m of text.matchAll(/<loc>([^<]+)<\/loc>/g)) add(m[1].trim());
      for (const m of text.matchAll(/href="([^"#]+)"/g)) add(m[1].replace(/&amp;/g, "&"));
    }
  } catch (error) {
    results.set(key, { key, status: 0, bytes: 0, error: String(error) });
  }
};

// The sitemap is slow and lists the pages that matter most, so it goes first and alone.
seen.add("/sitemap.xml");
await render("/sitemap.xml", 300000);
if (results.get("/sitemap.xml").status !== 200) throw new Error("sitemap did not render");
["/", "/robots.txt", "/feed.xml"].forEach(add);

let active = 0;
const worker = async () => {
  for (;;) {
    const key = queue.shift();
    if (!key) {
      if (active === 0) return;
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }
    active += 1;
    await render(key, 120000);
    active -= 1;
  }
};
await Promise.all(Array.from({ length: WORKERS }, worker));

// The local server drops some requests under load, so failures get slower retries.
for (let round = 0; round < 3; round += 1) {
  const failed = [...results.values()].filter((r) => r.status === 0).map((r) => r.key);
  for (const key of failed) await render(key, 180000);
}

const config = JSON.parse(fs.readFileSync("dist/server/wrangler.json", "utf8"));
fs.copyFileSync("scripts/static-edge/edge.mjs", "dist/server/edge.mjs");
fs.writeFileSync("dist/server/edge-wrangler.json", JSON.stringify({
  ...config,
  main: "edge.mjs",
  assets: { ...config.assets, html_handling: "none", run_worker_first: ["/*", "!/_next/*"] },
}, null, 1));

const rows = [...results.values()];
const counts = {};
for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
const bad = rows.filter((r) => r.status !== 200).slice(0, 15).map((r) => `${r.status} ${r.key}`);
console.log(JSON.stringify({ pages: rows.length, counts, capped: seen.size >= maxPages, mb: +(rows.reduce((s, r) => s + r.bytes, 0) / 1e6).toFixed(1), bad }, null, 1));
fs.writeFileSync("dist/prerender-report.json", JSON.stringify(rows, null, 1));
