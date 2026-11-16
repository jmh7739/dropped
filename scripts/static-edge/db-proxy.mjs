// Local Supabase proxy used only while the preview build renders its pages.
//  - Identical GET reads are answered once per build from memory (pages repeat the
//    same listing queries hundreds of times).
//  - The first 402 (quota) answer, or three server failures in a row, opens a circuit:
//    every later request is refused locally, so a blocked project is asked once,
//    and pages fall back to the static price snapshot.
//  - Counts the bytes received from the database and writes them to a stats file.
// Usage: node scripts/static-edge/db-proxy.mjs <port> <stats-file>   (env: SUPABASE_URL)
import http from "node:http";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";

const HOP = new Set(["host", "connection", "content-length", "accept-encoding", "transfer-encoding", "keep-alive"]);

export function createProxy({ upstream, fetchImpl = fetch, onStats = () => {} }) {
  const cache = new Map();
  const stats = { requests: 0, upstreamRequests: 0, cacheHits: 0, refused: 0, bytes: 0, statuses: {}, circuit: null };
  let serverFailures = 0;
  const report = () => onStats({ ...stats, statuses: { ...stats.statuses } });

  async function handle(req, res) {
    stats.requests += 1;
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const auth = createHash("sha1").update(`${req.headers.apikey ?? ""}|${req.headers.authorization ?? ""}|${req.headers.accept ?? ""}|${req.headers["accept-profile"] ?? ""}|${req.headers.prefer ?? ""}`).digest("hex");
    const key = `${req.method} ${req.url} ${auth}`;
    const cacheable = req.method === "GET" || req.method === "HEAD";
    if (cacheable && cache.has(key)) {
      stats.cacheHits += 1;
      const hit = cache.get(key);
      res.writeHead(hit.status, hit.headers);
      res.end(req.method === "HEAD" ? undefined : hit.body);
      return;
    }
    if (stats.circuit) {
      stats.refused += 1;
      res.writeHead(503, { "content-type": "application/json", "retry-after": "3600" });
      res.end(JSON.stringify({ message: `database unavailable during this build (${stats.circuit})`, code: "BUILD_CIRCUIT_OPEN" }));
      return;
    }
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) if (!HOP.has(k)) headers[k] = v;
    let upstreamRes;
    try {
      stats.upstreamRequests += 1;
      upstreamRes = await fetchImpl(`${upstream}${req.url}`, {
        method: req.method, headers, body: cacheable || !body.length ? undefined : body,
        signal: AbortSignal.timeout(90000),
      });
    } catch (error) {
      serverFailures += 1;
      if (serverFailures >= 3) stats.circuit = `network: ${String(error).slice(0, 80)}`;
      report();
      res.writeHead(504, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: "database request failed", code: "BUILD_PROXY_TIMEOUT" }));
      return;
    }
    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    stats.bytes += buf.length;
    stats.statuses[upstreamRes.status] = (stats.statuses[upstreamRes.status] ?? 0) + 1;
    if (upstreamRes.status === 402) stats.circuit = "402 quota";
    else if (upstreamRes.status >= 500) { serverFailures += 1; if (serverFailures >= 3) stats.circuit = `${upstreamRes.status} server`; }
    else serverFailures = 0;
    const outHeaders = {};
    upstreamRes.headers.forEach((v, k) => { if (!HOP.has(k) && k !== "content-encoding") outHeaders[k] = v; });
    if (cacheable && upstreamRes.status >= 200 && upstreamRes.status < 300) cache.set(key, { status: upstreamRes.status, headers: outHeaders, body: buf });
    report();
    res.writeHead(upstreamRes.status, outHeaders);
    res.end(req.method === "HEAD" ? undefined : buf);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      console.error("db proxy error", String(error).slice(0, 160));
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
  });
  return { server, stats };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.argv[2] ?? 8798);
  const statsFile = process.argv[3] ?? "dist/db-proxy-stats.json";
  const upstream = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!upstream) throw new Error("SUPABASE_URL is required");
  const { server } = createProxy({ upstream, onStats: (s) => fs.writeFileSync(statsFile, JSON.stringify(s)) });
  server.listen(port, "127.0.0.1", () => console.log(`db proxy on 127.0.0.1:${port}`));
}
