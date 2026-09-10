import test from 'node:test';
import assert from 'node:assert/strict';
import { destinationPoint } from '../lib/corridor';

test('255-degree sun corridor projects west-southwest from Horsetail Fall', () => {
  const p = destinationPoint(37.72912, -119.62848, 255, 25);
  assert.ok(p.lon < -119.62848);
  assert.ok(p.lat < 37.72912);
  assert.ok(p.lon > -121 && p.lat > 36);
});
