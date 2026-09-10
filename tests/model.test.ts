import test from 'node:test';
import assert from 'node:assert/strict';
import { combineProbability } from '../lib/model';

test('impossible geometry hard-stops probability', () => { assert.equal(combineProbability(0, 1, 1, 1), 0); });
test('missing critical water input never becomes a confident probability', () => { assert.equal(combineProbability(1, null, 1, 1), null); });
test('opaque western sky collapses probability', () => { assert.equal(combineProbability(1, 1, 0, 1), 0); });
test('ideal inputs can produce a high probability', () => { const p = combineProbability(1, .95, .95, .95); assert.ok(p !== null && p > .8 && p <= 1); });
test('water cannot be compensated by perfect sky', () => { const p = combineProbability(1, .05, 1, 1); assert.ok(p !== null && p < .1); });
