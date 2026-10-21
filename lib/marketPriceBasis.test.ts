import test from 'node:test';
import assert from 'node:assert/strict';
import { marketPriceBasis } from './marketPriceBasis.ts';
test('official package size is retained instead of labelling package price per kg or piece', () => {
  assert.equal(marketPriceBasis({unit:'kg',unit_sz:'10'})?.displayUnit,'10kg');
  assert.equal(marketPriceBasis({unit:'개',unit_sz:'10'})?.displayUnit,'10개');
  assert.equal(marketPriceBasis({unit:'kg',unit_sz:'0.5'})?.displayUnit,'0.5kg');
});
test('unknown and invalid size never defaults to one', () => {
  for(const unit_sz of [undefined,'',0,-1,'unknown','Infinity']) assert.equal(marketPriceBasis({unit:'kg',unit_sz}),null);
});
