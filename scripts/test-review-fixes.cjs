// Regression checks for the 2026-11-15 review fixes: affiliate notices, retail
// page weight, price analysis text, guide cases and server-rendered fallbacks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const result = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports: result.exports, module: result, Date, Number, Map, Set, Math, JSON, Intl, URL, URLSearchParams, Array, Object, String,
    require: id => { if (id in dependencies) return dependencies[id]; throw new Error(id); } });
  return result.exports;
}

// 1. Affiliate disclosure matches the links on the page.
const aff = load('lib/affiliate.ts');
assert.deepEqual([...aff.affiliatePrograms([{ url: 'https://s.click.aliexpress.com/s/abc', platform: 'aliexpress' }])], ['aliexpress']);
assert.deepEqual([...aff.affiliatePrograms([{ url: 'https://link.coupang.com/a/xyz' }])], ['coupang']);
assert.deepEqual([...aff.affiliatePrograms([{ url: 'https://click.linkprice.com/click.php?m=x', platform: 'cps' }])], ['linkprice']);
assert.deepEqual([...aff.affiliatePrograms([{ url: 'https://www.coupang.com.evil.example/x' }])], []);
assert.ok(!aff.ALIEXPRESS_AFFILIATE_NOTICE.includes('쿠팡'));
assert.ok(!aff.GENERAL_AFFILIATE_NOTICE.includes('쿠팡 파트너스 활동'));
const footer = fs.readFileSync('components/AffiliateDisclosure.tsx', 'utf8');
assert.ok(!footer.includes('COUPANG_PARTNERS_NOTICE'), 'footer must not show the Coupang notice on every page');
const pricePage = fs.readFileSync('app/price/[id]/page.tsx', 'utf8');
assert.match(pricePage, /programs=\{buyPrograms\}/);

// 2. Brand wording: the brand is never written as the verb "떨어졌다가".
for (const file of ['lib/purchaseSummary.ts', 'lib/affiliate.ts', 'app/price/[id]/page.tsx', 'app/contact/page.tsx']) {
  assert.ok(!/떨어졌다가 /.test(fs.readFileSync(file, 'utf8')), file);
}

// 3. Error fallback leads with useful content, not a failure headline.
const errorPage = fs.readFileSync('app/error.tsx', 'utf8');
assert.ok(!/<h1[^>]*>[^<]*불러오지 못했/.test(errorPage));
assert.match(errorPage, /data-render-error/);
assert.match(fs.readFileSync('scripts/static-edge/prerender.mjs', 'utf8'), /data-render-error/);
const tracking = fs.readFileSync('app/tracking/page.tsx', 'utf8');
assert.match(tracking, /가격 추적은 이렇게 작동합니다/);
assert.match(tracking, /catch/);

// 4. Store deals: one page of offers, never the whole catalog.
const retail = load('lib/retail.ts');
const coverage = load('lib/retail-coverage.ts', { './retail': retail });
const retailPage = load('lib/retailPage.ts', { './retail': retail, './retail-coverage': coverage });
const snapshot = JSON.parse(fs.readFileSync('data/retail-promotions.json', 'utf8'));
const page = retailPage.buildRetailPage(snapshot, new URLSearchParams('period=all'));
assert.ok(page.offers.length <= retailPage.RETAIL_PAGE_SIZE);
assert.ok(page.offers.every(o => o.history.length <= 8));
assert.ok(JSON.stringify(page).length < 150000, 'store-deals page data must stay small');
const second = retailPage.buildRetailPage(snapshot, new URLSearchParams('period=all&page=2'));
if (page.pageCount > 1) assert.notEqual(second.offers[0].id, page.offers[0].id);
assert.equal(retailPage.retailHref({ ...page.filters, period: 'current' }, 2), '/store-deals?page=2');
assert.ok(!fs.readFileSync('app/store-deals/page.tsx', 'utf8').includes('JSON.stringify(catalog)'));

// 5. Price analysis text is computed from the record.
const report = load('lib/priceReport.ts');
const analysis = load('lib/priceAnalysis.ts', { './priceReport': report });
const day = 86400000, now = Date.now();
const history = Array.from({ length: 40 }, (_, i) => ({ price: i % 10 === 0 ? 9000 : 10000 + (i % 3) * 100, collectedAt: new Date(now - (40 - i) * day).toISOString() }));
const stats = report.priceStats(history, 10200);
const a = analysis.analyzePriceHistory(history, stats, now);
assert.ok(a.paragraphs.length >= 2 && a.whenToBuy.length >= 2);
assert.match(a.paragraphs.join(' '), /9,000원/);
assert.ok(a.band && a.band.low <= a.band.high);

// 6. Guide cases come from deal records and say nothing when there are none.
const format = load('lib/format.ts', {});
const cases = load('lib/guideCases.ts', { './format': format });
const trap = { productId: 1, title: '테스트 상품', platform: 'cps', mallName: 'G마켓', status: 'active', isPriceError: false, currentPrice: 10000, listPrice: 30000, discountVsList: 67, avg30Price: 9800, trackedDays: 40, historyPointCount: 90, isLowestEver: false, discountVsAvg: null, checkedAt: new Date().toISOString() };
const g = cases.guideCases('price-drop-failures', [trap]);
assert.equal(g.cases[0].productId, 1);
assert.match(g.summary[0], /1개\(100%\)/);
assert.equal(cases.guideCases('price-drop-failures', []).cases.length, 0);
assert.equal(cases.guideCases('unknown-guide', [trap]), null);

// 7. Sitemap keeps template price pages below editorial pages.
const sitemap = fs.readFileSync('app/sitemap.ts', 'utf8');
assert.match(sitemap, /\? 0\.3 : 0\.1/);
assert.match(sitemap, /lastModified/);

// 8. Privacy policy covers the required sections.
const privacy = fs.readFileSync('app/privacy/page.tsx', 'utf8');
for (const word of ['국외 이전', '행태정보', 'adssettings.google.com', 'aboutads.info', '118', '1833-6972', '1301', '182', '개인정보 보호책임자', '2026년 11월 15일', 'Cloudflare']) assert.ok(privacy.includes(word), word);

console.log('PASS: affiliate notices by link, brand wording, fallbacks, paged store deals, price analysis, guide cases, sitemap priority, privacy policy');
