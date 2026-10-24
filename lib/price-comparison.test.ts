import test from 'node:test';
import assert from 'node:assert/strict';
import { compareObservedAverage as compare } from './price-comparison.ts';
test('observed average comparison retains small drops and distinguishes rises',()=>{
 assert.equal(compare(9999,10000).text,'0.1% 미만 낮음');
 assert.equal(compare(9975,10000).text,'0.3% 낮음');
 assert.equal(compare(10001,10000).text,'0.1% 미만 높음');
 assert.equal(compare(10200,10000).text,'2.0% 높음');
 assert.equal(compare(10000,10000).direction,'equal');
 assert.equal(compare(10000,0).direction,'unknown');
});
