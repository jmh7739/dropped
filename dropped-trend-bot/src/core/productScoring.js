const config = require("./config");
const { cleanText, normalizeKeyword, keywordTokens, clamp } = require("./text");
const { hasMatchingBrand } = require("./trendFilter");
const { isBadTitle } = require("./productResolver");

const ACCESSORY = /케이스|커버|필름|보호필름|강화유리|스트랩|파우치|거치대|충전기|케이블|어댑터|깔창|끈|양말|티슈|클리너|세정제|필터|카트리지|리필|소모품|부품|액세서리|악세사리|스킨|스티커|캡|홀더/;
const MAIN_PRODUCT = /본체|세트|완제품|콘솔|스마트폰|태블릿|노트북|모니터|TV|티비|냉장고|세탁기|건조기|정수기|비데|등산화|운동화|카메라|청소기|에어컨/;

function isAccessoryMismatch(keyword, title) {
  const normalizedKeyword = normalizeKeyword(keyword);
  const cleanTitle = cleanText(title);
  return ACCESSORY.test(cleanTitle) && !ACCESSORY.test(normalizedKeyword);
}

function calculateProductScore(keyword, product, index = 0) {
  const w = config.PRODUCT_SCORE;
  if (isBadTitle(product.title)) return 0;
  const title = normalizeKeyword(product.title);
  const full = normalizeKeyword(keyword);
  const tokens = keywordTokens(keyword);
  const fullMatched = Boolean(full && title.includes(full));
  const matchingBrand = hasMatchingBrand(keyword, product.title);
  let score = w.base;
  if (fullMatched) score += w.fullKeyword;
  const matched = tokens.filter(token => title.includes(token));
  if (!fullMatched && matched.length === 0 && !matchingBrand) return 0;
  if (tokens.length) score += Math.round((matched.length / tokens.length) * w.tokenCoverage);
  if (tokens.length >= 2 && matched.length === tokens.length) score += w.allTokens;
  if (matchingBrand) score += w.brandModel;
  if (MAIN_PRODUCT.test(cleanText(product.title))) score += w.mainProduct;
  if (isAccessoryMismatch(keyword, product.title)) score -= w.accessory;
  score += Math.max(0, w.searchOrderMax - index);
  if (product.imageUrl) score += w.image;
  if (cleanText(product.title).length < 8) score -= w.shortTitle;
  return clamp(Math.round(score), 0, 100);
}

module.exports = { calculateProductScore, isAccessoryMismatch };
