const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const result = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports: result.exports, module: result, Date, Number, Map,
    require: id => { if (id in dependencies) return dependencies[id]; throw new Error(id); } });
  return result.exports;
}

async function main() {
  const { priceStats, dealVerdict } = load('lib/priceReport.ts');
  const now = Date.now();
  const at = days => new Date(now - days * 86400000).toISOString();
  const stats = priceStats([{price:100,collectedAt:at(14)},{price:120,collectedAt:at(13)}],120);
  assert.equal(stats.trackedDays, 1, 'collection outage must not increase tracking duration');
  assert.equal(stats.enoughData, false);
  const clean = priceStats([{price:0,collectedAt:at(1)},{price:1,collectedAt:'invalid'},
    {price:1,collectedAt:at(-2)},{price:100,collectedAt:at(1)}],100);
  assert.equal(clean.points, 1);
  assert.equal(priceStats([{price:1,collectedAt:at(1)}],0),null);
  assert.equal(priceStats([{price:100,collectedAt:at(100)},{price:100,collectedAt:at(0)}],100).lowestLabel,'90일 최저가');
  assert.equal(priceStats([{price:100,collectedAt:at(12)},{price:100,collectedAt:at(0)}],100).lowestLabel,'추적 12일 최저가');
  assert.doesNotMatch(dealVerdict({discountVsAvg:20,avg30Price:120,currentPrice:100,isLowestEver:true,
    trackedDays:90,historyPointCount:100}).reason,/역대/);

  const rows = Array.from({length:2005}, (_,i) => ({id:i+1,product_id:i%2+1,price:100+i,
    collected_at:new Date(Date.now()-86400000+i*1000).toISOString()}));
  const pages=[];
  const fake={ from(table) {
    assert.equal(table,'price_history');
    let start=0,end=999;
    return { select(){return this},gt(){return this},lte(){return this},in(){return this},
      order(){return this},gte(){return this},range(a,b){start=a;end=b;return this},
      then(resolve){pages.push(start);return Promise.resolve(resolve({data:rows.slice(start,end+1),error:null}))} };
  }};
  const {readPriceHistory}=load('lib/priceHistory.ts',{'./supabase':{supabase:fake}});
  const grouped=await readPriceHistory([1,2]);
  assert.equal(grouped.get(1).length+grouped.get(2).length,2005);
  assert.equal(grouped.get(1).at(-1).price,2104,'latest price must survive API pagination');
  assert.deepEqual(pages,[0,1000,2000]);
  const failing = load('lib/priceHistory.ts',{'./supabase':{supabase:{from(){return {
    select(){return this},gt(){return this},lte(){return this},in(){return this},order(){return this},range(){return this},
    then(resolve){return Promise.resolve(resolve({data:null,error:{code:'network_failure'}}))},
  }}}}});
  await assert.rejects(failing.readPriceHistory([1]),/unavailable/);
  console.log('PASS: invalid/future prices, actual tracking duration, honest minimum labels, multi-page latest prices, failed fetch');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
