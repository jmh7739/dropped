import test from 'node:test';
import assert from 'node:assert/strict';
import { priceChartDate } from './chart-dates.ts';

test('a Korean price observation day is stable even when the server uses UTC', () => {
  assert.equal(priceChartDate('2026-10-17T15:30:00Z'), '10월 18일');
  assert.equal(priceChartDate('2026-10-17T14:59:00Z'), '10월 17일');
  assert.equal(priceChartDate('not-a-date'), '날짜 확인 필요');
});
