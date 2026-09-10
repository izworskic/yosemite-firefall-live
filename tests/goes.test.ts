import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCatalogFrames, parseMaskCsv } from '../lib/goes';

test('parses and chronologically sorts GOES CloudMask catalog paths', () => {
  const xml = '<dataset urlPath="satellite/goes/18/products/CloudMask/CONUS/current/OR_ABI-L2-ACMC-M6_G18_s20260411200000_e20260411205000_c20260411206000.nc"/><dataset urlPath="satellite/goes/18/products/CloudMask/CONUS/current/OR_ABI-L2-ACMC-M6_G18_s20260411155000_e20260411159500_c20260411200000.nc"/>';
  const frames = parseCatalogFrames(xml);
  assert.equal(frames.length, 2);
  assert.ok(frames[1].observedAt.getTime() > frames[0].observedAt.getTime());
});

test('maps NOAA four-level ACM mask into openness and honors DQF', () => {
  assert.equal(parseMaskCsv('time,ACM,DQF\n2026-01-01T00:00Z,0,0').openness, 1);
  assert.equal(parseMaskCsv('time,ACM,DQF\n2026-01-01T00:00Z,3,0').openness, 0);
  assert.equal(parseMaskCsv('time,ACM,DQF\n2026-01-01T00:00Z,0,1').openness, null);
});
