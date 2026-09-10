const { normalizeKeyword } = require("./text");

function coupangSearchUrl(keyword) {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(String(keyword || "").trim())}`;
}

function keywordQueueItem(trend) {
  return {
    type: "keywordSearch",
    keyword: trend.keyword,
    normalizedKeyword: trend.normalizedKeyword || normalizeKeyword(trend.keyword),
    productId: null,
    originalUrl: coupangSearchUrl(trend.keyword),
    affiliateUrl: "",
    status: "pending",
  };
}

function productQueueItem(trend, product) {
  return {
    type: "product",
    keyword: trend.keyword,
    normalizedKeyword: trend.normalizedKeyword || normalizeKeyword(trend.keyword),
    productId: product.productId,
    productTitle: product.title,
    originalUrl: product.url,
    affiliateUrl: product.affiliateUrl || "",
    status: product.affiliateUrl ? "success" : "pending",
  };
}

module.exports = { coupangSearchUrl, keywordQueueItem, productQueueItem };
