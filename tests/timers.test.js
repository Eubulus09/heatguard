import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCountdown } from '../src/timers.js';

test('countdown formatting pads minutes and seconds', () => {
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(65), '01:05');
  assert.equal(formatCountdown(3600), '60:00');
  assert.equal(formatCountdown(-10), '00:00');
});
