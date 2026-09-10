function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/새 창 열림/gi, "").trim();
}

function normalizeKeyword(value) {
  return cleanText(value).toLowerCase().replace(/[^0-9a-z가-힣]/gi, "");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function keywordTokens(value) {
  const raw = cleanText(value).toLowerCase();
  const chunks = raw.match(/[a-z]+|[가-힣]+|\d+(?:kg|g|ml|l|tb|gb|인치)?/gi) || [];
  return [...new Set(chunks.map(normalizeKeyword).filter(token => token.length >= 2))];
}

module.exports = { cleanText, normalizeKeyword, clamp, keywordTokens };
