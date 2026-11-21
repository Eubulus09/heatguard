import { readJSON, writeJSON } from './storage.js';

const KEY = 'places';

export const DEMO_PLACES = [
  { name: 'Example shaded rest spot', kind: 'shade', area: 'Demo only', note: 'Replace with a real place you know.' },
  { name: 'Example water point', kind: 'water', area: 'Demo only', note: 'Replace with a real place you know.' }
];

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanText(value, max = 80) {
  return String(value || '').trim().slice(0, max);
}

export function listPlaces() {
  const rows = readJSON(KEY, []);
  return Array.isArray(rows) ? rows : [];
}

export function addPlace(input) {
  const name = cleanText(input.name, 60);
  if (!name) return null;

  const place = {
    id: makeId(),
    name,
    kind: ['shade', 'water', 'both'].includes(input.kind) ? input.kind : 'shade',
    area: cleanText(input.area, 60),
    note: cleanText(input.note, 140),
    demo: false,
    createdAt: Date.now()
  };

  const places = [place, ...listPlaces()].slice(0, 100);
  writeJSON(KEY, places);
  return place;
}

export function removePlace(id) {
  writeJSON(KEY, listPlaces().filter((place) => place.id !== id));
}

export function clearPlaces() {
  writeJSON(KEY, []);
}

export function loadDemoPlaces() {
  const existing = listPlaces();
  const demos = DEMO_PLACES.map((place, index) => ({
    ...place,
    id: `demo-${index}`,
    demo: true,
    createdAt: Date.now() + index
  }));

  const merged = [...existing.filter((place) => !place.id.startsWith('demo-')), ...demos];
  writeJSON(KEY, merged);
  return merged;
}
