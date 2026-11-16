import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { configure, refresh, write } from "./price-snapshot.mjs";

const iso = (d) => new Date(Date.now() - d * 86400000).toISOString();

function mockDb(handler) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const u = decodeURIComponent(String(url));
    calls.push(u);
    const body = handler(u);
    return new Response(JSON.stringify(body), { status: 200 });
  };
  return calls;
}

test("refresh only asks for rows newer than the previous snapshot for known products", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "snap-"));
  configure({ outDir: dir, dbUrl: "https://db.example", dbKey: "test" });
  const prevAt = iso(1);
  const prev = {
    version: 1, generatedAt: prevAt, metaRefreshedAt: new Date().toISOString(), knownIds: [],
    products: { 5: { id: 5, platform: "cps", title: "기존 상품", imageUrl: "", productUrl: "#", affiliateUrl: "#", listPrice: 0, mallName: null, shippingFee: null, unitPrice: null, categorySlug: "food", categoryName: "식품", hasActiveDeal: false, likeCount: 0, history: [[Math.floor(Date.parse(iso(10)) / 1000), 1000]] } },
  };
  const calls = mockDb((u) => {
    if (u.includes("v_active_deals")) return [{ product_id: 5 }, { product_id: 7 }];
    if (u.includes("products?select=id&")) return [];
    if (u.includes("products?select=id,platform")) return [{ id: 7, platform: "aliexpress", title: "새 상품", categories: { slug: "digital", name: "디지털" } }];
    if (u.includes("deal_stats")) return [];
    if (u.includes("price_history") && u.includes("in.(5)")) return [{ product_id: 5, price: 900, collected_at: iso(0.5) }];
    if (u.includes("price_history") && u.includes("in.(7)")) return [{ product_id: 7, price: 2000, collected_at: iso(30) }, { product_id: 7, price: 1800, collected_at: iso(0.2) }];
    return [];
  });
  const snap = await refresh(prev);
  const hist5 = calls.find((c) => c.includes("price_history") && c.includes("in.(5)"));
  assert.ok(hist5.includes(`collected_at=gte.${new Date(Date.parse(prevAt) - 2 * 3600000).toISOString()}`), "known product fetches only the increment");
  assert.equal(snap.products[5].history.length, 2);
  assert.equal(snap.products[5].hasActiveDeal, true);
  assert.equal(snap.products[7].history.length, 2);
  assert.equal(snap.products[7].title, "새 상품");
  write(snap);
  const index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
  assert.equal(index.products[7].current, 1800);
  assert.ok(fs.existsSync(path.join(dir, "p", "5.json")));
});

test("history keeps the lowest and the last observation of each Korean day", async () => {
  const { downsampleDaily } = await import("./price-snapshot.mjs");
  const day = Date.UTC(2026, 10, 1, 0, 0, 0) / 1000; // 09:00 KST
  const h = [[day, 1000], [day + 3600, 900], [day + 7200, 950], [day + 10800, 980], [day + 86400, 1000]];
  assert.deepEqual(downsampleDaily(h), [[day + 3600, 900], [day + 10800, 980], [day + 86400, 1000]]);
});

test("the newest non-empty previous copy wins and older copies only fill gaps", async () => {
  const { choosePrevious } = await import("./price-snapshot.mjs");
  const p = (id) => ({ id, history: [[1, 1]] });
  const empty = { version: 1, generatedAt: null, products: {}, knownIds: [1, 2, 3] };
  const seed = { version: 1, generatedAt: "2026-11-14T00:00:00Z", products: { 1: p(1), 2: p(2) }, knownIds: [3] };
  const live = { version: 1, generatedAt: "2026-11-15T00:00:00Z", products: { 1: { ...p(1), title: "live" } }, knownIds: [] };
  assert.equal(choosePrevious([empty, null]), null);
  const best = choosePrevious([live, empty, seed]);
  assert.equal(best.generatedAt, live.generatedAt);
  assert.equal(best.products[1].title, "live");
  assert.ok(best.products[2]);
  assert.deepEqual(best.knownIds, [3]);
});

test("a blocked database keeps the previous snapshot unchanged", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "snap-"));
  const seedDir = fs.mkdtempSync(path.join(os.tmpdir(), "seed-"));
  const { main } = await import("./price-snapshot.mjs");
  const seedPath = path.join(seedDir, "seed.json.gz");
  const zlib = await import("node:zlib");
  const seed = { version: 1, generatedAt: iso(2), metaRefreshedAt: null, knownIds: [], products: { 9: { id: 9, platform: "cps", title: "시드", imageUrl: "", productUrl: "#", affiliateUrl: "#", listPrice: 0, mallName: null, shippingFee: null, unitPrice: null, categorySlug: "", categoryName: "기타", hasActiveDeal: false, likeCount: 0, history: [[Math.floor(Date.parse(iso(3)) / 1000), 500]] } } };
  fs.writeFileSync(seedPath, zlib.gzipSync(JSON.stringify(seed)));
  configure({ outDir: dir, dbUrl: "https://db.example", dbKey: "test", sources: ["https://live.example"], seedPath });
  let dbCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("https://live.example")) return new Response(JSON.stringify({ version: 1, generatedAt: null, products: {}, knownIds: [9] }), { status: 200 });
    dbCalls += 1;
    return new Response('{"message":"exceed_egress_quota"}', { status: 402 });
  };
  await main();
  assert.equal(dbCalls, 1, "stops at the first refused request");
  const index = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
  assert.equal(index.generatedAt, seed.generatedAt);
  assert.equal(index.products[9].current, 500);
});
