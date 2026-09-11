const config = require("./config");

function rankDisplayTrends(collected, previousRanks, limit = config.REALTIME_TREND_LIMIT) {
  return collected
    .map(item => ({
      ...item,
      previousDisplayRank: previousRanks.get(item.normalizedKeyword) || null,
      // 수집 단계에서 계산한 전일 대비 원본 점수를 그대로 사용한다.
      // 직전 화면 순위를 점수에 재투입하면 매 회차 순위가 반대로 튀는 피드백이 생긴다.
      displayScore: Number(item.trendScore) || 0,
    }))
    .sort((a, b) => b.displayScore - a.displayScore || a.currentRank - b.currentRank)
    .slice(0, limit);
}

module.exports = { rankDisplayTrends };
