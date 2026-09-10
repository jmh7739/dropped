const http = require("http");
const { getDb } = require("./worker");

const HOST = "127.0.0.1";
const PORT = 43127;

function sendJson(response, status, body, origin = "") {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...(origin.startsWith("chrome-extension://") ? { "access-control-allow-origin": origin, vary: "origin" } : {}),
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error("요청이 너무 큽니다.");
  }
  return raw ? JSON.parse(raw) : {};
}

async function listQueue() {
  const db = getDb();
  const { data, error } = await db
    .from("affiliate_queue")
    .select("id,type,keyword,normalized_keyword,external_product_id,original_url,status")
    .eq("status", "pending")
    .order("created_at")
    .limit(20);
  if (error) throw error;
  return data || [];
}

async function saveResult(body) {
  const id = Number(body?.id);
  const status = body?.status === "success" ? "success" : "error";
  const affiliateUrl = String(body?.affiliateUrl || "").trim();
  if (!Number.isInteger(id) || id <= 0) throw new Error("잘못된 대기열 ID입니다.");
  if (status === "success" && !/^https:\/\/link\.coupang\.com\//i.test(affiliateUrl)) throw new Error("잘못된 파트너스 링크입니다.");

  const db = getDb();
  const { data: item, error: readError } = await db.from("affiliate_queue").select("*").eq("id", id).single();
  if (readError) throw readError;
  const { error: updateError } = await db.from("affiliate_queue").update({
    status,
    affiliate_url: status === "success" ? affiliateUrl : null,
    error: status === "error" ? String(body?.error || "링크 생성 실패").slice(0, 1000) : null,
    attempts: (item.attempts || 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (updateError) throw updateError;

  if (status === "success" && item.type === "keywordSearch") {
    await db.from("affiliate_keyword_cache").upsert({
      normalized_keyword: item.normalized_keyword,
      keyword: item.keyword,
      affiliate_url: affiliateUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: "normalized_keyword" });
  }
  if (status === "success" && item.type === "product") {
    if (item.product_id) await db.from("products").update({ affiliate_url: affiliateUrl }).eq("id", item.product_id);
    else if (item.external_product_id) await db.from("products").update({ affiliate_url: affiliateUrl }).eq("platform", "coupang").eq("external_product_id", item.external_product_id);
  }
  return { ok: true };
}

function startAffiliateBridge({ onQueueDrained, log = console.log } = {}) {
  const server = http.createServer(async (request, response) => {
    const origin = String(request.headers.origin || "");
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        ...(origin.startsWith("chrome-extension://") ? { "access-control-allow-origin": origin } : {}),
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,POST,OPTIONS",
      });
      return response.end();
    }
    try {
      if (request.method === "GET" && request.url === "/queue") return sendJson(response, 200, await listQueue(), origin);
      if (request.method === "POST" && request.url === "/result") return sendJson(response, 200, await saveResult(await readJson(request)), origin);
      if (request.method === "POST" && request.url === "/refresh") {
        sendJson(response, 202, { ok: true }, origin);
        Promise.resolve(onQueueDrained?.()).catch(error => log(`[파트너스 후처리] ${error.message}`));
        return;
      }
      return sendJson(response, 404, { error: "not_found" }, origin);
    } catch (error) {
      log(`[파트너스 브리지] ${error.message}`);
      return sendJson(response, 500, { error: error.message }, origin);
    }
  });
  server.on("error", error => log(`[파트너스 브리지] ${error.message}`));
  server.listen(PORT, HOST, () => log(`파트너스 자동화 브리지 시작: http://${HOST}:${PORT}`));
  return server;
}

module.exports = { HOST, PORT, listQueue, saveResult, startAffiliateBridge };
