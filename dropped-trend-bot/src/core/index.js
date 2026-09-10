module.exports = {
  config: require("./config"),
  ...require("./text"),
  ...require("./trendFilter"),
  ...require("./trendScoring"),
  ...require("./trendCollector"),
  ...require("./productResolver"),
  ...require("./productScoring"),
  ...require("./productDiversity"),
  ...require("./productImage"),
  ...require("./affiliateQueue"),
};
