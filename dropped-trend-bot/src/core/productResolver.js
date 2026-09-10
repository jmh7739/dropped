const { cleanText } = require("./text");

function decodeRepeatedly(value) {
  let text = String(value || "");
  for (let i = 0; i < 4; i += 1) {
    try { const decoded = decodeURIComponent(text); if (decoded === text) break; text = decoded; } catch { break; }
  }
  return text;
}

function findCoupangUrl(raw) {
  const match = decodeRepeatedly(raw).match(/https?:\/\/(?:www\.)?coupang\.com\/vp\/products\/\d+[^\s"'<>]*/i);
  return match ? match[0] : null;
}

function normalizeCoupangUrl(raw) {
  try {
    const candidate = findCoupangUrl(raw);
    if (!candidate) return null;
    const url = new URL(candidate);
    if (url.hostname !== "coupang.com" && !url.hostname.endsWith(".coupang.com")) return null;
    const allowed = new Set(["itemId", "vendorItemId"]);
    [...url.searchParams.keys()].forEach(key => { if (!allowed.has(key)) url.searchParams.delete(key); });
    return url.toString();
  } catch { return null; }
}

function productIdFromUrl(url) {
  return String(url).match(/\/products\/(\d+)/)?.[1] || String(url);
}

function isBadTitle(title) {
  const text = cleanText(title);
  return !text || /^쿠팡\s*www\.coupang\.com/i.test(text) || /coupang\.com\s*[›>]/i.test(text) || (text.match(/›/g) || []).length >= 2 || /^쿠팡\s*[-–|]/i.test(text) || /현재 별점.*리뷰.*지금 쿠팡|쿠팡에서.*구매하고 더 많은 혜택|지금 쿠팡에서 더 저렴하고/i.test(text);
}

module.exports = { normalizeCoupangUrl, productIdFromUrl, isBadTitle };
