import assert from "node:assert/strict";
import test from "node:test";
import { clearTtlCache, withTtlCache } from "../lib/ttlCache.ts";

test("reuses a finished result only until it expires", async () => {
  clearTtlCache();
  let time = 0, calls = 0;
  const load = async () => ++calls;
  assert.equal(await withTtlCache("k", 100, load, () => time), 1);
  time = 99;
  assert.equal(await withTtlCache("k", 100, load, () => time), 1);
  time = 100;
  assert.equal(await withTtlCache("k", 100, load, () => time), 2);
});

test("does not keep a failed load", async () => {
  clearTtlCache();
  await assert.rejects(withTtlCache("bad", 100, async () => { throw new Error("down"); }));
  assert.equal(await withTtlCache("bad", 100, async () => "ok"), "ok");
});
