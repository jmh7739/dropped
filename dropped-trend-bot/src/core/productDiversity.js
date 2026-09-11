const config = require("./config");

function totalScore(row) {
  return Number(row?.trend?.trendScore || 0) + Number(row?.product?.productScore || 0);
}

function productLimitForTrend(trend) {
  const rank = Number(trend?.displayRank || 0);
  return rank >= 1 && rank <= config.TOP_TREND_COUNT
    ? config.TOP_TREND_SELECTED_PRODUCTS
    : config.DEFAULT_SELECTED_PRODUCTS_PER_TREND;
}

function diversifyProductSelections(rows, limit = config.TRENDING_PRODUCT_MAX) {
  const seenProducts = new Set();
  const perKeyword = new Map();
  const grouped = new Map();

  for (const row of [...rows].sort((a, b) => totalScore(b) - totalScore(a))) {
    const productId = String(row?.product?.productId || "");
    const keyword = String(row?.trend?.normalizedKeyword || row?.trend?.keyword || "");
    if (!productId || seenProducts.has(productId)) continue;
    if ((perKeyword.get(keyword) || 0) >= productLimitForTrend(row?.trend)) continue;
    seenProducts.add(productId);
    perKeyword.set(keyword, (perKeyword.get(keyword) || 0) + 1);
    const category = row?.trend?.category || "기타";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(row);
  }

  const categories = [...grouped.keys()].sort(
    (a, b) => totalScore(grouped.get(b)[0]) - totalScore(grouped.get(a)[0])
  );
  const selected = [];
  let added = true;
  while (selected.length < limit && added) {
    added = false;
    for (const category of categories) {
      const used = selected.filter(row => (row?.trend?.category || "기타") === category).length;
      if (used >= config.MAX_TRENDING_PRODUCTS_PER_CATEGORY) continue;
      const next = grouped.get(category).shift();
      if (!next) continue;
      selected.push(next);
      added = true;
      if (selected.length >= limit) break;
    }
  }
  return selected;
}

module.exports = { diversifyProductSelections, productLimitForTrend };
