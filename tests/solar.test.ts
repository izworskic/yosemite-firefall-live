import test from 'node:test';
import assert from 'node:assert/strict';
import { solarForDate, zonedDateKey } from '../lib/solar';

test('California evening remains on Yosemite local calendar day after UTC date rolls', () => {
  const californiaEvening = new Date('2027-02-20T02:00:00Z');
  assert.equal(zonedDateKey(californiaEvening), '2027-02-19');
  const solar = solarForDate(californiaEvening);
  assert.equal(zonedDateKey(solar.sunset), '2027-02-19');
});
