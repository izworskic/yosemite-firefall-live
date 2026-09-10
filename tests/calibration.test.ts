import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCalibration, type VerifiedOutcome } from '../lib/calibration';

const rows = (pairs: Array<[number, 0 | 1]>): VerifiedOutcome[] => pairs.map((pair, i) => ({
  date: `2026-02-${String(i + 10).padStart(2, '0')}`,
  probability: pair[0], outcome: pair[1], source: 'fixture', verifiedAt: '2026-03-01T00:00:00Z'
}));

test('empty outcome ledger is explicitly insufficient rather than calibrated', () => {
  const result = computeCalibration([], 30);
  assert.equal(result.status, 'insufficient-data');
  assert.equal(result.brierScore, null);
});

test('perfect forecasts have near-zero Brier score and log loss', () => {
  const result = computeCalibration(rows([[100, 1], [0, 0]]), 2);
  assert.ok((result.brierScore ?? 1) < 0.000001);
  assert.ok((result.logLoss ?? 1) < 0.00001);
});

test('well-separated forecasts beat climatology on Brier skill', () => {
  const result = computeCalibration(rows([[90, 1], [80, 1], [20, 0], [10, 0]]), 4);
  assert.ok((result.brierSkillScore ?? -1) > 0);
  assert.equal(result.status, 'calibrating');
});
