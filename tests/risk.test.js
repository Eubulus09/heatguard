import test from 'node:test';
import assert from 'node:assert/strict';
import { riskLevelFromApparent, planForRisk, buildHourlyPlan, formatHour } from '../src/risk.js';

test('risk thresholds follow apparent temperature bands', () => {
  assert.equal(riskLevelFromApparent(26.9), 'normal');
  assert.equal(riskLevelFromApparent(27), 'caution');
  assert.equal(riskLevelFromApparent(31.9), 'caution');
  assert.equal(riskLevelFromApparent(32), 'high');
  assert.equal(riskLevelFromApparent(38.9), 'high');
  assert.equal(riskLevelFromApparent(39), 'danger');
});

test('direct sun raises risk by one level', () => {
  assert.equal(riskLevelFromApparent(28, true), 'high');
  assert.equal(riskLevelFromApparent(39, true), 'danger');
  assert.equal(riskLevelFromApparent('bad'), 'normal');
});

test('each risk level has a practical plan', () => {
  assert.equal(planForRisk('normal').breakMinutes, 90);
  assert.equal(planForRisk('caution').breakMinutes, 60);
  assert.equal(planForRisk('high').breakMinutes, 45);
  assert.equal(planForRisk('danger').breakMinutes, 30);
  assert.equal(planForRisk('unknown').breakMinutes, 90);
});

test('hourly plan starts at the current hour and finds the peak', () => {
  const hourly = [
    { time: '2026-11-21T09:00', apparent: 28, temp: 30 },
    { time: '2026-11-21T10:00', apparent: 33, temp: 34 },
    { time: '2026-11-21T11:00', apparent: 41, temp: 38 }
  ];

  const plan = buildHourlyPlan(hourly, false, '2026-11-21T10:00');
  assert.equal(plan.hours.length, 2);
  assert.equal(plan.hours[0].level, 'high');
  assert.equal(plan.peak.time, '2026-11-21T11:00');
  assert.equal(plan.peak.level, 'danger');
  assert.equal(formatHour('2026-11-21T13:00'), '1 PM');
  assert.equal(formatHour(''), '—');
});
