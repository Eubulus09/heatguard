# HeatGuard

A low-data, installable heat-safety companion for market traders and roadside vendors. It turns a local forecast into a simple risk level, a practical water and shade plan, and a place to save shade and water points on the device.

HeatGuard is a planning aid, not a medical device. It does not diagnose or treat heat illness.

## Features

- Current “feels like” risk level for a chosen city or your location.
- Direct-sun toggle that raises the guidance level.
- Next 12-hour heat strip with the peak time.
- Suggested water and shade break cadence with a countdown timer.
- Water and shade check-ins saved on this device.
- Browser alerts with an in-app fallback if alerts are not enabled.
- Local list of shade and water points; no account or server.
- Example places clearly marked as demo.
- Offline app shell and cached last forecast with a stale-data notice.
- Large tap targets and high-contrast colours for phone use.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL, usually http://localhost:5173.

## Test it

```bash
npm test
```

## Build it

```bash
npm run build
npm run preview
```

The production build is written to `dist/`. The Vite `base` is `./`, so the folder can be served from a subpath.

## How the risk level works

HeatGuard uses hourly `apparent_temperature` from Open-Meteo. The bands are deliberately simple:

- below 27°C: lower risk
- 27–31.9°C: caution
- 32–38.9°C: high heat
- 39°C and above: danger

If “I am in direct sun” is on, the level is raised by one band. These bands are planning guidance adapted from public heat-index categories, not a substitute for local warnings or medical advice.

## Data and privacy

- Weather comes from the Open-Meteo forecast API. No API key is used.
- Location, sun preference, check-ins, and saved places are stored in `localStorage` on the device.
- Nothing is uploaded by HeatGuard.
- The last forecast is cached for up to 15 minutes. If a refresh fails, HeatGuard shows the cached data with a stale notice.

## Project layout

- `src/main.js` — UI rendering and event handling.
- `src/risk.js` — pure risk thresholds and hourly plan logic.
- `src/weather.js` — forecast fetch, normalisation, and caching.
- `src/places.js` — local shade and water point storage.
- `src/timers.js` — countdown logic.
- `src/safety.js` — static warning signs and emergency guidance.
- `src/storage.js` — small `localStorage` wrapper.
- `src/styles.css` — responsive styling.
- `public/sw.js` — offline service worker.
- `tests/` — Node test runner tests for risk, weather, and countdown logic.

## Credits

Weather data by Open-Meteo under CC BY 4.0. Risk bands are based on public National Weather Service heat-index guidance.
