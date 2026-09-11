const path = require("path");
const os = require("os");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const { findAutomaticTrends, findRealtimeTrends } = require("./automation");
const {
  config,
  rankStatus,
  keywordQueueItem,
  productQueueItem,
  diversifyProductSelections,
  isUsableProductImage,
  normalizeProductImage,
  rankDisplayTrends,
  productLimitForTrend,
  calculateProductScore,
} = require("./core");

function loadLocalEnv() {
  const file = path.resolve(__dirname, "..", "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadLocalEnv();

const CATEGORY_SLUG = {
  패션: "fashion", 패션잡화: "fashion", 뷰티: "beauty", 디지털: "digital",
  인테리어: "living", 육아: "baby", 식품: "food", 스포츠: "sports", 생활: "living", 여가: "living",
};

function getDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function latestTrendMap(db) {
  const { data: newest, error } = await db.from("realtime_trends").select("collected_at").eq("is_published", true).order("collected_at", { ascending: false }).limit(1);
  if (error) throw error;
  if (!newest?.length) return new Map();
  const { data, error: rowsError } = await db.from("realtime_trends").select("normalized_keyword,rank").eq("collected_at", newest[0].collected_at);
  if (rowsError) throw rowsError;
  return new Map((data || []).map(row => [row.normalized_keyword, row.rank]));
}

async function enqueueIfMissing(db, item) {
  if (item.type === "keywordSearch") {
    const { data: cached } = await db.from("affiliate_keyword_cache").select("affiliate_url").eq("normalized_keyword", item.normalizedKeyword).maybeSingle();
    if (cached?.affiliate_url) return cached.affiliate_url;
    const { data: queued } = await db.from("affiliate_queue").select("id,status,affiliate_url").eq("type", "keywordSearch").eq("normalized_keyword", item.normalizedKeyword).order("created_at", { ascending: false }).limit(1);
    if (!queued?.length) await db.from("affiliate_queue").insert({ type: item.type, keyword: item.keyword, normalized_keyword: item.normalizedKeyword, original_url: item.originalUrl });
    else if (queued[0].status === "error") await db.from("affiliate_queue").update({ status: "pending", error: null, updated_at: new Date().toISOString() }).eq("id", queued[0].id);
    else if (queued[0].status === "success" && queued[0].affiliate_url) {
      await db.from("affiliate_keyword_cache").upsert({ normalized_keyword: item.normalizedKeyword, keyword: item.keyword, affiliate_url: queued[0].affiliate_url, updated_at: new Date().toISOString() }, { onConflict: "normalized_keyword" });
      return queued[0].affiliate_url;
    }
    return null;
  }
  const { data: product } = await db.from("products").select("affiliate_url").eq("external_product_id", item.productId).eq("platform", "coupang").maybeSingle();
  if (product?.affiliate_url) return product.affiliate_url;
  const { data: queued } = await db.from("affiliate_queue").select("id,status,affiliate_url").eq("type", "product").eq("external_product_id", item.productId).order("created_at", { ascending: false }).limit(1);
  if (!queued?.length) await db.from("affiliate_queue").insert({ type: item.type, keyword: item.keyword, normalized_keyword: item.normalizedKeyword, product_id: item.dbProductId, external_product_id: item.productId, original_url: item.originalUrl });
  else if (queued[0].status === "error") await db.from("affiliate_queue").update({ status: "pending", error: null, product_id: item.dbProductId, updated_at: new Date().toISOString() }).eq("id", queued[0].id);
  else if (queued[0].status === "success" && queued[0].affiliate_url) {
    await db.from("products").update({ affiliate_url: queued[0].affiliate_url }).eq("platform", "coupang").eq("external_product_id", item.productId);
    return queued[0].affiliate_url;
  }
  return null;
}

async function saveRealtimeTrends(db, collected) {
  const previous = await latestTrendMap(db);
  const rescored = rankDisplayTrends(collected, previous, config.REALTIME_TREND_LIMIT);
  const collectedAt = new Date().toISOString();
  const rows = [];
  for (let index = 0; index < rescored.length; index += 1) {
    const item = rescored[index];
    const rank = index + 1;
    const previousRank = previous.get(item.normalizedKeyword) || null;
    const movement = rankStatus(rank, previousRank);
    const affiliateUrl = await enqueueIfMissing(db, keywordQueueItem(item));
    rows.push({ keyword: item.keyword, normalized_keyword: item.normalizedKeyword, rank, previous_rank: previousRank, rank_change: movement.rankChange, status: movement.status, hot_score: item.displayScore, category: item.category, affiliate_search_url: affiliateUrl, collected_at: collectedAt });
  }
  const ready = rows.length === config.REALTIME_TREND_LIMIT && rows.every(row => row.affiliate_search_url);
  const { error } = await db.from("realtime_trends").insert(rows.map(row => ({ ...row, is_published: ready })));
  if (error) throw error;
  return rows;
}

async function ensureProduct(db, trend, product) {
  const { data: existing, error } = await db.from("products").select("id,affiliate_url,image_url").eq("platform", "coupang").eq("external_product_id", product.productId).maybeSingle();
  if (error) throw error;
  const imageUrl = isUsableProductImage(product.imageUrl) ? normalizeProductImage(product.imageUrl) : null;
  if (existing) {
    const imageUpdate = imageUrl
      ? { image_url: imageUrl }
      : (!isUsableProductImage(existing.image_url) ? { image_url: null } : {});
    // 검색 결과의 가격은 같은 카드 안 다른 상품 가격과 섞일 수 있어 저장하지 않는다.
    await db.from("products").update({ title: product.title, product_url: product.url, ...imageUpdate, list_price: null }).eq("id", existing.id);
    return existing;
  }
  const slug = CATEGORY_SLUG[trend.category] || "living";
  const { data: category } = await db.from("categories").select("id").eq("slug", slug).maybeSingle();
  const { data: created, error: insertError } = await db.from("products").insert({ platform: "coupang", external_product_id: product.productId, title: product.title, category_id: category?.id || null, image_url: imageUrl, product_url: product.url, mall_name: "쿠팡", list_price: null }).select("id,affiliate_url").single();
  if (insertError) throw insertError;
  return created;
}

async function appendReusableTopProducts(db, rankedTrends, active, activePerTrend, activePerCategory) {
  if (active.length >= config.TRENDING_PRODUCT_MAX) return;
  const { data: products, error } = await db
    .from("products")
    .select("id,title,image_url,affiliate_url")
    .eq("platform", "coupang")
    .like("affiliate_url", "https://link.coupang.com/%")
    .limit(500);
  if (error) throw error;

  const usedProductIds = new Set(active.map(row => String(row.product_id)));
  for (const trend of rankedTrends.slice(0, config.TOP_TREND_COUNT)) {
    if (active.length >= config.TRENDING_PRODUCT_MAX) break;
    const trendKey = trend.normalizedKeyword || trend.keyword;
    const category = trend.category || "기타";
    const reusable = (products || [])
      .filter(product => !usedProductIds.has(String(product.id)) && isUsableProductImage(product.image_url))
      .map((product, index) => ({
        product,
        score: calculateProductScore(trend.keyword, { title: product.title, imageUrl: product.image_url }, index + 8),
      }))
      .filter(row => row.score >= config.MIN_PRODUCT_SCORE)
      .sort((a, b) => b.score - a.score);

    for (const { product, score } of reusable) {
      if (active.length >= config.TRENDING_PRODUCT_MAX) break;
      if ((activePerTrend.get(trendKey) || 0) >= productLimitForTrend(trend)) break;
      if ((activePerCategory.get(category) || 0) >= config.MAX_TRENDING_PRODUCTS_PER_CATEGORY) break;
      if (usedProductIds.has(String(product.id))) continue;
      active.push({
        keyword: trend.keyword,
        product_id: product.id,
        product_score: score,
        hot_score: trend.trendScore,
        category: trend.category,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      usedProductIds.add(String(product.id));
      activePerTrend.set(trendKey, (activePerTrend.get(trendKey) || 0) + 1);
      activePerCategory.set(category, (activePerCategory.get(category) || 0) + 1);
    }
  }
}

async function saveTrendingProducts(db, trends) {
  // 우선 검색어당 설정 개수만 노출하되, 링크 제한 상품이 있으면 다음 후보까지 확인한다.
  const rankedTrends = trends.map((trend, index) => ({ ...trend, displayRank: index + 1 }));
  const candidates = rankedTrends
    .flatMap(trend => (trend.productCandidates || [])
      .filter(product => product && product.productScore >= config.MIN_PRODUCT_SCORE)
      .slice(0, config.PRODUCT_CANDIDATE_LIMIT)
      .map(product => ({ trend, product })))
    .sort((a, b) => (b.trend.trendScore + b.product.productScore) - (a.trend.trendScore + a.product.productScore));
  const selected = diversifyProductSelections(candidates, config.TRENDING_PRODUCT_MAX);
  const primaryIds = new Set(selected.map(row => String(row.product.productId)));
  const ordered = [...selected, ...candidates.filter(row => !primaryIds.has(String(row.product.productId)))];
  const active = [];
  const attemptedProducts = new Set();
  const activePerTrend = new Map();
  const activePerCategory = new Map();
  for (const { trend, product } of ordered) {
    if (active.length >= config.TRENDING_PRODUCT_MAX) break;
    const productId = String(product.productId || "");
    const trendKey = trend.normalizedKeyword || trend.keyword;
    const category = trend.category || "기타";
    if (!productId || attemptedProducts.has(productId)) continue;
    if ((activePerTrend.get(trendKey) || 0) >= productLimitForTrend(trend)) continue;
    if ((activePerCategory.get(category) || 0) >= config.MAX_TRENDING_PRODUCTS_PER_CATEGORY) continue;
    attemptedProducts.add(productId);
    try {
      const dbProduct = await ensureProduct(db, trend, product);
      const affiliateUrl = await enqueueIfMissing(db, { ...productQueueItem(trend, product), dbProductId: dbProduct.id });
      const prepared = { keyword: trend.keyword, product_id: dbProduct.id, product_score: product.productScore, hot_score: trend.trendScore, category: trend.category, is_active: Boolean(affiliateUrl), updated_at: new Date().toISOString() };
      const { error: preparedError } = await db.from("trending_products").upsert(prepared, { onConflict: "product_id" });
      if (preparedError) throw preparedError;
      if (!affiliateUrl) continue; // 실제 파트너스 링크 생성 전에는 카드/구매 버튼을 노출하지 않음
      active.push(prepared);
      activePerTrend.set(trendKey, (activePerTrend.get(trendKey) || 0) + 1);
      activePerCategory.set(category, (activePerCategory.get(category) || 0) + 1);
    } catch (error) {
      console.warn(`[상품 저장 실패] ${trend.keyword}: ${error.message}`);
    }
  }
  // 새 후보의 링크가 제한/대기 상태여도, 이전에 검증된 쿠팡 수익링크 상품으로 상위 1~3위를 보강한다.
  await appendReusableTopProducts(db, rankedTrends, active, activePerTrend, activePerCategory);
  if (active.length < config.TRENDING_PRODUCT_MIN) {
    console.warn(`요즘 뜨는 상품 준비 ${active.length}/${config.TRENDING_PRODUCT_MIN}개: 기존 활성 목록을 유지합니다.`);
    return [];
  }
  await db.from("trending_products").update({ is_active: false }).eq("is_active", true);
  for (const row of active) {
    const { error } = await db.from("trending_products").upsert(row, { onConflict: "product_id" });
    if (error) throw error;
  }
  return active;
}

function profileDir() {
  return process.env.TREND_BROWSER_PROFILE || path.join(os.tmpdir(), "dropped-trend-worker-profile");
}

async function runRealtimeTrendUpdate() {
  const db = getDb();
  const trends = await findRealtimeTrends({ profileDir: profileDir(), log: console.log });
  const saved = await saveRealtimeTrends(db, trends);
  console.log(`실시간 TOP${saved.length} 저장 완료`);
  return saved;
}

async function runTrendingProductsUpdate() {
  const db = getDb();
  const trends = await findAutomaticTrends({ profileDir: profileDir(), log: console.log });
  const saved = await saveTrendingProducts(db, trends);
  console.log(`요즘 뜨는 상품 ${saved.length}개 활성화 완료`);
  return saved;
}

async function main() {
  const command = process.argv[2] || "all";
  if (command === "realtime") await runRealtimeTrendUpdate();
  else if (command === "products") await runTrendingProductsUpdate();
  else if (command === "all") { await runRealtimeTrendUpdate(); await runTrendingProductsUpdate(); }
  else throw new Error("사용법: node src/worker.js realtime|products|all");
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });

module.exports = { getDb, runRealtimeTrendUpdate, runTrendingProductsUpdate, saveRealtimeTrends, saveTrendingProducts };
