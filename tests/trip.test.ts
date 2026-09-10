import test from 'node:test';
import assert from 'node:assert/strict';
import { correlatedAtLeastOne } from '../lib/trip';

test('single-night optimizer preserves the nightly probability', () => {
  assert.equal(correlatedAtLeastOne([60]), 60);
});

test('correlated multi-night odds improve without naive independence inflation', () => {
  const chance = correlatedAtLeastOne([60,60,60], 'test-window', 20000, .55);
  const independent = Math.round((1 - Math.pow(.4,3)) * 100);
  assert.ok(chance > 60);
  assert.ok(chance < independent);
});
