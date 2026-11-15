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
