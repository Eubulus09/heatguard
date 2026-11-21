import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWeather } from '../src/weather.js';

test('weather normalisation keeps current and hourly values aligned', () => {
  const data = {
    timezone: 'Africa/Lagos',
    current: {
      time: '2026-11-21T12:00',
      temperature_2m: 33,
      relative_humidity_2m: 70,
      apparent_temperature: 39,
      wind_speed_10m: 8
    },
    hourly: {
      time: ['2026-11-21T12:00', '2026-11-21T13:00'],
      temperature_2m: [33, 34],
      relative_humidity_2m: [70, 68],
      apparent_temperature: [39, 40],
      wind_speed_10m: [8, 9]
    }
  };

  const result = normalizeWeather(data, { name: 'Lagos', latitude: 6.5244, longitude: 3.3792 }, 1000);
  assert.equal(result.current.apparent, 39);
  assert.equal(result.current.humidity, 70);
  assert.equal(result.hourly.length, 2);
  assert.equal(result.hourly[1].apparent, 40);
  assert.equal(result.timezone, 'Africa/Lagos');
});

test('weather normalisation falls back to air temperature when feels-like is missing', () => {
  const data = {
    current: { temperature_2m: 31 },
    hourly: { time: ['2026-11-21T12:00'], temperature_2m: [31] }
  };

  const result = normalizeWeather(data, { name: 'Lagos', latitude: 6.5244, longitude: 3.3792 });
  assert.equal(result.current.apparent, 31);
  assert.equal(result.hourly[0].apparent, 31);
});
