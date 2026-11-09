// Serves pre-rendered pages from static assets so a page view stays within the
// free Workers CPU limit. Anything without a stored copy goes to the normal app.
import app from "./index.js";

const DYNAMIC = /^\/(api|go|_next)(\/|$)/;

const extensionFor = (path) => (/\.(xml|txt)$/.exec(path)?.[0] ?? ".html");

async function storedName(path, params) {
  params.sort();
  const query = params.toString();
  const text = new TextEncoder().encode(query ? `${path}?${query}` : path);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", text));
  const hex = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
  return `/__static/${hex}${extensionFor(path)}`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/__static/")) return new Response("Not found", { status: 404 });
    if ((request.method !== "GET" && request.method !== "HEAD") || DYNAMIC.test(url.pathname)) {
      return app.fetch(request, env, ctx);
    }

    let path = url.pathname.replace(/\.rsc$/, "");
    if (path === "/index") path = "/";
    if (path.length > 1) path = path.replace(/\/$/, "");
    const params = new URLSearchParams(url.search);
    params.delete("_rsc");

    const stored = await env.ASSETS.fetch(new URL(await storedName(path, params), url.origin));
    if (!stored.ok) return app.fetch(request, env, ctx);

    // A client navigation that receives HTML falls back to a full page load.
    const headers = new Headers(stored.headers);
    headers.set("Cache-Control", "public, max-age=300");
    headers.set("X-Dropped-Static", "1");
    return new Response(stored.body, { status: 200, headers });
  },
};
