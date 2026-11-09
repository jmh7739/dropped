import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = readFileSync(new URL('./edge.mjs', import.meta.url), 'utf8')
  .replace('import app from "./index.js";', '')
  .replace('export default {', 'globalThis.edge = {');

function fixture() {
  const entries = new Map();
  let renders = 0;
  const app = { fetch: async () => {
    renders++;
    return new Response('<html>fresh price</html>', { headers: { 'Content-Type': 'text/html' } });
  } };
  const caches = { default: {
    match: async (request) => entries.get(request.url)?.clone(),
    put: async (request, response) => { entries.set(request.url, response.clone()); },
  } };
  const context = { app, caches, crypto: webcrypto, Response, Request, Headers, URL,
    URLSearchParams, TextEncoder, console };
  runInNewContext(source, context);
  const env = { ASSETS: { fetch: async () => new Response('<html>old price</html>') } };
  const jobs = [];
  const ctx = { waitUntil: promise => jobs.push(promise) };
  return { edge: context.edge, env, ctx, jobs, get renders() { return renders; } };
}

test('retail listing refreshes the stored page and keeps preview noindex', async () => {
  const f = fixture();
  const request = new Request('https://preview.workers.dev/store-deals?brand=lotte');
  const first = await f.edge.fetch(request, f.env, f.ctx);
  assert.equal(first.headers.get('X-Dropped-Refreshing'), '1');
  assert.equal(first.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.match(await first.text(), /old price/);
  await Promise.all(f.jobs);
  assert.equal(f.renders, 1);
  const second = await f.edge.fetch(request, f.env, f.ctx);
  assert.equal(second.headers.get('X-Dropped-Live'), '1');
  assert.equal(second.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.match(await second.text(), /fresh price/);
  assert.equal(f.renders, 1);
});

test('Supabase-heavy homepage and editorial pages remain stored', async () => {
  const f = fixture();
  const home = await f.edge.fetch(new Request('https://preview.workers.dev/'), f.env, f.ctx);
  assert.equal(home.headers.get('X-Dropped-Refreshing'), null);
  const about = await f.edge.fetch(new Request('https://preview.workers.dev/about'), f.env, f.ctx);
  assert.equal(about.headers.get('X-Dropped-Static'), '1');
  assert.equal(about.headers.get('X-Dropped-Refreshing'), null);
  await Promise.all(f.jobs);
});

test('retail details and calendar also refresh', async () => {
  for (const path of ['/store-deals/sample', '/store-deals/calendar']) {
    const f = fixture();
    const response = await f.edge.fetch(new Request(`https://preview.workers.dev${path}`), f.env, f.ctx);
    assert.equal(response.headers.get('X-Dropped-Refreshing'), '1', path);
    await Promise.all(f.jobs);
  }
});
