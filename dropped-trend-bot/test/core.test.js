const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateHotScore, isHardExcluded, rankStatus, calculateProductScore, selectHotTrends, isBadTitle, diversifyProductSelections, isUsableProductImage, normalizeProductImage, rankDisplayTrends, productLimitForTrend } = require("../src/core");

test("서비스/여행형 키워드를 제외한다", () => {
  ["부산요트투어", "일본여행", "식전영상", "연극예매", "렌터카", "캠핑카렌트"].forEach(value => assert.equal(isHardExcluded(value), true));
});

test("범용 가전·사무·생활용품 키워드를 제외한다", () => {
  ["에어컨", "캐리어냉난방기", "전자레인지", "전자렌지", "A4용지", "복사용지", "빨래건조대", "가습기", "청호나이스정수기", "수건"].forEach(value => assert.equal(isHardExcluded(value), true));
  ["닌텐도스위치2", "AHC아이크림", "스팸선물세트", "나이키운동화"].forEach(value => assert.equal(isHardExcluded(value), false));
});

test("시즌/브랜드/모델 키워드가 범용어보다 높은 Hot Score를 받는다", () => {
  const generic = calculateHotScore(1, 2, "사다리");
  const seasonal = calculateHotScore(7, 18, "추석선물세트");
  const model = calculateHotScore(8, null, "닌텐도스위치2");
  assert.ok(seasonal > generic);
  assert.ok(model > generic);
  assert.ok(calculateHotScore(1, 2, "정수기") < calculateHotScore(8, null, "헤라블랙쿠션"));
  assert.ok(calculateHotScore(1, 2, "쌀20kg") < seasonal);
});

test("직전 TOP20 기준 등락 표기를 계산한다", () => {
  assert.deepEqual(rankStatus(3, 6), { status: "up", rankChange: 3 });
  assert.deepEqual(rankStatus(8, 6), { status: "down", rankChange: -2 });
  assert.deepEqual(rankStatus(4, null), { status: "NEW", rankChange: null });
  assert.deepEqual(rankStatus(2, 2), { status: "same", rankChange: 0 });
});

test("화면 직전 순위가 원본 트렌드 정렬 점수를 뒤집지 않는다", () => {
  const collected = [
    { keyword: "상위", normalizedKeyword: "상위", trendScore: 90, currentRank: 2 },
    { keyword: "하위", normalizedKeyword: "하위", trendScore: 70, currentRank: 1 },
  ];
  const ranked = rankDisplayTrends(collected, new Map([["상위", 20], ["하위", 1]]), 20);
  assert.deepEqual(ranked.map(item => item.keyword), ["상위", "하위"]);
  assert.deepEqual(ranked.map(item => item.displayScore), [90, 70]);
});

test("본상품이 액세서리보다 높은 Product Score를 받는다", () => {
  const main = calculateProductScore("닌텐도스위치2", { title: "닌텐도 스위치2 본체 정품 콘솔", imageUrl: "x" }, 0);
  const accessory = calculateProductScore("닌텐도스위치2", { title: "닌텐도 스위치2 강화유리 보호필름 케이스", imageUrl: "x" }, 0);
  assert.ok(main > accessory + 30);
});

test("검색엔진 광고성 스니펫을 상품명에서 제외한다", () => {
  assert.equal(isBadTitle("현재 별점 4.7점, 리뷰 300개를 가진 상품! 지금 쿠팡에서 더 저렴하고 확인하세요."), true);
});

test("쿠팡 파비콘은 상품 이미지로 사용하지 않는다", () => {
  assert.equal(isUsableProductImage("https://search.pstatic.net/sunny?src=https%3A%2F%2Fwww.coupang.com%2Ffavicon.ico&type=f30_30_png_expire24"), false);
  assert.equal(isUsableProductImage("https://thumbnail.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/product.jpg"), true);
});

test("네이버 이미지 프록시를 쿠팡 CDN 원본 주소로 바꾼다", () => {
  const source = "https://thumbnail.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/product.jpg";
  const proxy = `https://search.pstatic.net/sunny?src=${encodeURIComponent(source)}&type=fff208_208_ar`;
  assert.equal(normalizeProductImage(proxy), source);
});

test("카테고리 강제 균등 없이 독점만 제한한다", () => {
  const candidates = Array.from({ length: 8 }, (_, index) => ({ keyword: `브랜드모델${index}`, normalizedKeyword: `브랜드모델${index}`, category: index < 6 ? "디지털" : "식품", trendScore: 100 - index, currentRank: index + 1 }));
  const selected = selectHotTrends(candidates, 6);
  assert.equal(selected.filter(item => item.category === "디지털").length, 4);
  assert.equal(selected.length, 6);
});

test("트렌드 상품을 카테고리 라운드로빈으로 다양하게 선발한다", () => {
  const rows = ["식품", "식품", "식품", "디지털", "패션", "스포츠"].map((category, index) => ({
    trend: { keyword: `키워드${index}`, normalizedKeyword: `키워드${index}`, category, trendScore: 100 - index },
    product: { productId: String(index + 1), productScore: 80 - index },
  }));
  const selected = diversifyProductSelections(rows, 4);
  assert.equal(new Set(selected.map(row => row.trend.category)).size, 4);
});

test("실시간 1~3위는 상품을 네 개까지 선발한다", () => {
  assert.equal(productLimitForTrend({ displayRank: 1 }), 4);
  assert.equal(productLimitForTrend({ displayRank: 3 }), 4);
  assert.equal(productLimitForTrend({ displayRank: 4 }), 2);
});
