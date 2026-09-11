const { clamp, normalizeKeyword } = require("./text");
const { isLikelyShoppingKeyword } = require("./trendFilter");

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").trim();
}

function parseTraffic(value) {
  const text = String(value || "").replace(/,/g, "").trim().toUpperCase();
  const match = text.match(/([\d.]+)\s*([KMB만억]?)/);
  if (!match) return 0;
  const units = { K: 1e3, M: 1e6, B: 1e9, "만": 1e4, "억": 1e8 };
  return Math.round(Number(match[1]) * (units[match[2]] || 1));
}

function parseGoogleTrendRss(xml) {
  return [...String(xml || "").matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map((match, index) => {
      const block = match[1];
      const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
      const traffic = parseTraffic(decodeXml(block.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/i)?.[1]));
      const publishedAt = decodeXml(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]);
      return { title, normalizedKeyword: normalizeKeyword(title), traffic, publishedAt, sourceRank: index + 1 };
    })
    .filter(item => item.title && isLikelyShoppingKeyword(item.title));
}

function googleTrendScore(item) {
  const trafficBonus = Math.min(12, Math.max(0, Math.log10(Math.max(100, item.traffic || 0)) - 2) * 6);
  const recencyBonus = Math.max(0, 12 - (Math.max(1, item.sourceRank) - 1) * 1.5);
  return clamp(Math.round(72 + trafficBonus + recencyBonus), 0, 100);
}

function inferShoppingCategory(keyword) {
  const value = normalizeKeyword(keyword);
  if (/크림|화장품|스킨|로션|에센스|쿠션|파운데이션|립스틱|샴푸|헤라|설화수|에스티로더/.test(value)) return "뷰티";
  if (/운동화|등산화|구두|슬리퍼|샌들|바람막이|패딩|가디건|원피스|재킷|자켓|가방|백팩|나이키|아디다스|뉴발란스|호카|살로몬/.test(value)) return "패션";
  if (/스마트폰|태블릿|노트북|모니터|게임기|콘솔|이어폰|헤드폰|카메라|갤럭시|아이폰|아이패드|닌텐도|소니|삼성|엘지|lg/.test(value)) return "디지털";
  if (/갈비|한우|꽃게|대하|굴비|과일|홍삼|영양제|유산균|비타민|스팸|정관장/.test(value)) return "식품";
  if (/유모차|카시트|기저귀|분유|레고|포켓몬/.test(value)) return "육아";
  if (/캠핑|골프|낚시/.test(value)) return "스포츠";
  return "생활";
}

module.exports = { parseGoogleTrendRss, googleTrendScore, inferShoppingCategory };
