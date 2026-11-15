// Serves pre-rendered pages from static assets so a page view stays within the
// free Workers CPU limit. Anything without a stored copy goes to the normal app.
import app from "./index.js";

const DYNAMIC = /^\/(api|go|_next)(\/|$)/;
// Retail pages can refresh within the Workers Free subrequest budget. The
// Supabase-heavy homepage needs a scheduled static rebuild instead.
const LIVE_CONTENT = /^\/store-deals(?:\/.*)?$/;
const LIVE_CACHE_SECONDS = 300;

const extensionFor = (path) => (/\.(xml|txt)$/.exec(path)?.[0] ?? ".html");

async function storedName(path, params) {
  params.sort();
  const query = params.toString();
  const text = new TextEncoder().encode(query ? `${path}?${query}` : path);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", text));
  const hex = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
  return `/__static/${hex}${extensionFor(path)}`;
}

// The workers.dev address is a preview copy of the real domain; keep it out of search results.
function markPreview(url, response) {
  if (!url.hostname.endsWith(".workers.dev")) return response;
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function staticResponse(stored, refreshing = false) {
  const headers = new Headers(stored.headers);
  headers.set("Cache-Control", refreshing ? "no-store" : "public, max-age=300");
  headers.set("X-Dropped-Static", "1");
  if (refreshing) headers.set("X-Dropped-Refreshing", "1");
  return new Response(stored.body, { status: 200, headers });
}

async function refreshLive(request, env, ctx) {
  const fresh = await app.fetch(request, env, ctx);
  if (!fresh.ok || !fresh.headers.get("content-type")?.includes("text/html") || fresh.headers.has("set-cookie")) return;
  const headers = new Headers(fresh.headers);
  headers.set("Cache-Control", `public, max-age=${LIVE_CACHE_SECONDS}`);
  headers.set("X-Dropped-Live", "1");
  await caches.default.put(request, new Response(fresh.body, { status: fresh.status, headers }));
}

// A known product whose price record cannot be read right now answers 503 with
// Retry-After, so search engines keep the address and come back later.
async function priceStatus(path, response) {
  if (!path.startsWith("/price/") || response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")) return response;
  const text = await response.text();
  const headers = new Headers(response.headers);
  if (!text.includes("data-price-unavailable")) return new Response(text, { status: response.status, headers });
  headers.set("Retry-After", "3600");
  headers.set("Cache-Control", "no-store");
  return new Response(text, { status: 503, headers });
}

async function serve(request, env, ctx, url) {
  if (url.pathname.startsWith("/__static/")) return new Response("Not found", { status: 404 });
  // The price snapshot is a plain static file; pages and the next build read it.
  if (url.pathname.startsWith("/snapshot/")) return env.ASSETS.fetch(request);
  if ((request.method !== "GET" && request.method !== "HEAD") || DYNAMIC.test(url.pathname)) {
    return app.fetch(request, env, ctx);
  }

  let path = url.pathname.replace(/\.rsc$/, "");
  if (path === "/index") path = "/";
  if (path.length > 1) path = path.replace(/\/$/, "");
  const params = new URLSearchParams(url.search);
  params.delete("_rsc");

  const stored = await env.ASSETS.fetch(new URL(await storedName(path, params), url.origin));
  // Serve the existing copy immediately on a cold cache, then refresh it in
  // the background. This avoids a slow first view during a price-feed refresh.
  // Each cache entry expires after five minutes; a failed refresh leaves the
  // dated stored copy visible instead of presenting a failed fetch as current.
  if (request.method === "GET" && LIVE_CONTENT.test(path) && stored.ok &&
      !request.headers.has("RSC") && !url.searchParams.has("_rsc")) {
    const cached = await caches.default.match(request);
    if (cached) return cached;
    ctx.waitUntil(refreshLive(request, env, ctx).catch((error) => console.error("live page refresh failed", path, error)));
    return staticResponse(stored, true);
  }
  if (!stored.ok) return priceStatus(path, await app.fetch(request, env, ctx));

  // A client navigation that receives HTML falls back to a full page load.
  return staticResponse(stored);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // One address per page for search engines and AdSense: www goes to the main domain.
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    return markPreview(url, await serve(request, env, ctx, url));
  },
};
