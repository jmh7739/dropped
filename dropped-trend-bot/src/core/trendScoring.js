const config = require("./config");
const { normalizeKeyword, clamp } = require("./text");
const { isServiceKeyword, genericPenalty, hasBrandSignal } = require("./trendFilter");

const SEASON_TERMS = [
  /추석|한가위|설날|명절|선물세트|김장|수능|입학|졸업|신학기|어버이날|어린이날|크리스마스|연말/,
  /꽃게|대하|전어|굴|방어|딸기|수박|복숭아|참외|장마|폭염|한파|캠핑|스키|물놀이/,
];
const EVENT_TERMS = /신제품|신상|출시|사전예약|한정판|콜라보|에디션|시즌|월드컵|올림픽/;

function specificityBonus(keyword) {
  const value = normalizeKeyword(keyword);
  let score = 0;
  if (/\d/.test(value)) score += 5;
  if (/[a-z]/i.test(value) && /[가-힣]/.test(value)) score += 5;
  if (value.length >= 6) score += 4;
  if (value.length >= 9) score += 2;
  return Math.min(config.HOT_SCORE.specificityMax, score);
}

function calculateHotScore(currentRank, previousRank, keyword) {
  const w = config.HOT_SCORE;
  let score = Math.max(8, w.rankMax - (Math.max(1, currentRank) - 1) * 2.3);
  if (previousRank == null) score += w.newEntry;
  else {
    const change = previousRank - currentRank;
    if (change > 0) score += Math.min(w.riseMax, change * w.risePerRank);
    else if (change === 0) score += w.stable;
    else score -= Math.min(w.fallMax, Math.abs(change) * w.fallPerRank);
  }
  score += specificityBonus(keyword);
  if (hasBrandSignal(keyword)) score += w.brand;
  if (/[a-z가-힣]+\s*-?\s*\d{1,4}|\d{1,4}[a-z가-힣]+/i.test(String(keyword))) score += w.model;
  if (SEASON_TERMS.some(pattern => pattern.test(normalizeKeyword(keyword)))) score += w.season;
  if (EVENT_TERMS.test(normalizeKeyword(keyword))) score += w.event;
  score -= genericPenalty(keyword);
  if (isServiceKeyword(keyword)) score -= w.service;
  return clamp(Math.round(score), 0, 100);
}

function rankStatus(currentRank, previousRank) {
  if (previousRank == null) return { status: "NEW", rankChange: null };
  const change = previousRank - currentRank;
  if (change > 0) return { status: "up", rankChange: change };
  if (change < 0) return { status: "down", rankChange: change };
  return { status: "same", rankChange: 0 };
}

function classifyTrend(currentRank, previousRank) {
  const { status, rankChange } = rankStatus(currentRank, previousRank);
  if (status === "NEW") return "🆕 인기진입";
  if ((rankChange || 0) >= 6) return "🔥 급상승";
  if ((rankChange || 0) >= 2) return "📈 상승";
  if (currentRank <= 3) return "✨ TOP3";
  if (currentRank <= 10) return "⭐ TOP10";
  return "📌 인기권";
}

module.exports = { specificityBonus, calculateHotScore, rankStatus, classifyTrend };
