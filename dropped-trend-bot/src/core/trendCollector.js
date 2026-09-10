const config = require("./config");
const { normalizeKeyword } = require("./text");
const { isHardExcluded } = require("./trendFilter");

function selectHotTrends(candidates, limit = config.REALTIME_TREND_LIMIT) {
  const bestByKeyword = new Map();
  for (const item of candidates) {
    if (isHardExcluded(item.keyword)) continue;
    const key = item.normalizedKeyword || normalizeKeyword(item.keyword);
    const existing = bestByKeyword.get(key);
    if (!existing || item.trendScore > existing.trendScore) bestByKeyword.set(key, { ...item, normalizedKeyword: key });
  }
  const sorted = [...bestByKeyword.values()].sort((a, b) => b.trendScore - a.trendScore || a.currentRank - b.currentRank);
  const counts = new Map();
  const chosen = [];
  for (const item of sorted) {
    const category = item.category || "기타";
    const count = counts.get(category) || 0;
    if (count >= config.MAX_TRENDS_PER_CATEGORY) continue;
    chosen.push(item);
    counts.set(category, count + 1);
    if (chosen.length >= limit) break;
  }
  return chosen;
}

module.exports = { selectHotTrends };
