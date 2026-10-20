const test=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {isHardExcluded}=require('../src/core/trendFilter');
const src=fs.readFileSync(path.join(__dirname,'../../lib/trends.ts'),'utf8');
const body=src.slice(src.indexOf('function blockedTrendKeyword'),src.indexOf('function blockedSeasonalProduct')).replace('value: unknown', 'value').replace(': boolean', '');
const publicBlocked=vm.runInNewContext(body+'; blockedTrendKeyword');
test('the collector and public display both reject Korean team matchups without rejecting branded products',()=>{
  for(const word of ['KIA 대 LG','기아대엘지','삼성 라이온즈 대 한화 이글스','두산vs롯데','삼성디스플레이']) {
    assert.equal(isHardExcluded(word),true,word);assert.equal(publicBlocked(word),true,word);
  }
  for(const word of ['LG 모니터','삼성 갤럭시 S26','KIA 타이거즈 유니폼']){
    assert.equal(isHardExcluded(word),false,word);assert.equal(publicBlocked(word),false,word);
  }
});
