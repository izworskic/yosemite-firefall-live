import test from 'node:test';
import assert from 'node:assert/strict';
import { flowModel } from '../lib/model';

test('regional Merced flow cannot create a Horsetail water signal without source water', () => {
  const result = flowModel(0, 0, 8, 0, 2500);
  assert.ok(result.score !== null && result.score < 0.12);
  assert.equal(result.index, 'dry');
});

test('healthy snowpack plus melt can support a good Horsetail runoff signal', () => {
  const result = flowModel(14, -0.8, 6, 0, 500);
  assert.ok(result.score !== null && result.score >= 0.43);
  assert.ok(result.index === 'good' || result.index === 'strong');
});

test('recent precipitation can provide source water even when snow proxy is low', () => {
  const result = flowModel(0.5, 0, 4, 12, 200);
  assert.ok(result.score !== null && result.score >= 0.72);
  assert.equal(result.index, 'strong');
});

test('missing all source-water observations returns unknown rather than invented runoff', () => {
  const result = flowModel(null, null, 6, null, 1000);
  assert.equal(result.score, null);
  assert.equal(result.index, 'unknown');
});
