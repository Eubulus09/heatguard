import { readJSON, writeJSON } from './storage.js';

const CACHE_KEY = 'weather';
const CACHE_TTL = 15 * 60 * 1000;
const BASE = 'https://api.open-meteo.com/v1/forecast';

export const LOCATIONS = [
  { name: 'Lagos', latitude: 6.5244, longitude: 3.3792 },
  { name: 'Abuja', latitude: 9.0765, longitude: 7.3986 },
  { name: 'Port Harcourt', latitude: 4.8156, longitude: 7.0498 },
  { name: 'Kano', latitude: 12.0022, longitude: 8.592 }
];

export const DEFAULT_LOCATION = LOCATIONS[0];

function sameLocation(a, b) {
  return Math.abs(Number(a.latitude) - Number(b.latitude)) < 0.01 && Math.abs(Number(a.longitude) - Number(b.longitude)) < 0.01;
}

export function normalizeWeather(data, location, fetchedAt = Date.now()) {
  const currentSource = data.current || {};
  const hourlySource = data.hourly || {};
  const times = Array.isArray(hourlySource.time) ? hourlySource.time : [];

  const currentTemp = Number(currentSource.temperature_2m);
  const currentApparent = Number(currentSource.apparent_temperature);

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    locationName: location.name,
    timezone: data.timezone || 'auto',
    fetchedAt,
    current: {
      time: currentSource.time || times[0] || '',
      temp: Number.isFinite(currentTemp) ? currentTemp : 0,
      apparent: Number.isFinite(currentApparent) ? currentApparent : currentTemp,
      humidity: Number(currentSource.relative_humidity_2m),
      wind: Number(currentSource.wind_speed_10m)
    },
    hourly: times.map((time, index) => ({
      time,
      apparent: Number(hourlySource.apparent_temperature?.[index] ?? hourlySource.temperature_2m?.[index]),
      temp: Number(hourlySource.temperature_2m?.[index]),
      humidity: Number(hourlySource.relative_humidity_2m?.[index]),
      wind: Number(hourlySource.wind_speed_10m?.[index])
    }))
  };
}

export function cachedWeather() {
  const cached = readJSON(CACHE_KEY, null);
  if (!cached) return null;
  return { ...cached, stale: Date.now() - cached.fetchedAt > CACHE_TTL };
}

export async function getWeather(location, options = {}) {
  const cached = cachedWeather();
  const cachedMatches = cached && sameLocation(cached, location);

  if (!options.force && cachedMatches && !cached.stale) return cached;

  try {
    const fresh = await fetchWeather(location);
    writeJSON(CACHE_KEY, fresh);
    return fresh;
  } catch (error) {
    if (cachedMatches) return { ...cached, stale: true, error };
    throw error;
  }
}

export async function fetchWeather(location) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m',
    hourly: 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m',
    timezone: 'auto',
    forecast_days: '1'
  });

  const response = await fetch(`${BASE}?${params.toString()}`);
  if (!response.ok) throw new Error(`Weather request failed (${response.status})`);

  const data = await response.json();
  if (!data || !data.current || !data.hourly) throw new Error('Weather response was incomplete');

  return normalizeWeather(data, location);
}
