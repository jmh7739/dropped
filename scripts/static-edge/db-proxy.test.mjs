import assert from "node:assert/strict";
import { test } from "node:test";
import { createProxy } from "./db-proxy.mjs";

async function start(fetchImpl) {
  const { server, stats } = createProxy({ upstream: "https://db.example", fetchImpl });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, stats, close: () => new Promise((r) => server.close(r)) };
}

test("identical reads go to the database once per build", async () => {
  let calls = 0;
  const p = await start(async () => { calls += 1; return new Response("[1,2,3]", { status: 200, headers: { "content-type": "application/json" } }); });
  for (let i = 0; i < 5; i += 1) {
    const res = await fetch(`${p.base}/rest/v1/v_active_deals?select=id`, { headers: { apikey: "k" } });
    assert.equal(await res.text(), "[1,2,3]");
  }
  await fetch(`${p.base}/rest/v1/v_active_deals?select=id`, { headers: { apikey: "other" } });
  assert.equal(calls, 2, "a different key is a different read");
  assert.equal(p.stats.cacheHits, 4);
  assert.equal(p.stats.bytes, 14);
  await p.close();
});

test("a quota refusal opens the circuit so the project is not asked again", async () => {
  let calls = 0;
  const p = await start(async () => { calls += 1; return new Response('{"message":"exceed_egress_quota"}', { status: 402 }); });
  assert.equal((await fetch(`${p.base}/rest/v1/a`)).status, 402);
  for (const q of ["b", "c", "d"]) {
    const res = await fetch(`${p.base}/rest/v1/${q}`);
    assert.equal(res.status, 402, "a status supabase-js does not retry");
    assert.equal(res.headers.get("retry-after"), null);
  }
  assert.equal(calls, 1);
  assert.equal(p.stats.refused, 3);
  await p.close();
});
