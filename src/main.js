import './styles.css';
import { readJSON, writeJSON } from './storage.js';
import { DEFAULT_LOCATION, LOCATIONS, getWeather } from './weather.js';
import { RISK_LEVELS, riskLevelFromApparent, planForRisk, buildHourlyPlan, formatHour } from './risk.js';
import { createCountdown, formatCountdown } from './timers.js';
import { addPlace, clearPlaces, listPlaces, loadDemoPlaces, removePlace } from './places.js';
import { ACTION_STEPS, DISCLAIMER, EMERGENCY_SIGNS, WARNING_SIGNS } from './safety.js';

const app = document.querySelector('#app');

function todayKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function loadLocation() {
  const saved = readJSON('location', null);
  if (saved && typeof saved.name === 'string' && Number.isFinite(Number(saved.latitude)) && Number.isFinite(Number(saved.longitude))) {
    return saved;
  }
  return DEFAULT_LOCATION;
}

function loadCheckins() {
  const saved = readJSON('checkins', null);
  if (saved && saved.date === todayKey()) return saved;
  return { date: todayKey(), water: 0, shade: 0 };
}

const state = {
  location: loadLocation(),
  inSun: readJSON('inSun', false) === true,
  checkins: loadCheckins(),
  weather: null
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, onClick, className = 'btn') {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function displayNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number)) : '—';
}

function timeAgo(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - Number(timestamp)) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day ago`;
}

function setStatus(message) {
  const node = app.querySelector('#status');
  if (node) node.textContent = message || '';
}

function stat(label, value, unit) {
  const wrap = el('div', 'stat');
  wrap.append(el('span', 'stat-label', label), el('strong', 'stat-value', value), el('span', 'stat-unit', unit));
  return wrap;
}

function renderShell() {
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">HG</span>
        <span class="brand-copy"><strong>HeatGuard</strong><small>Outdoor work, safer in the heat</small></span>
      </div>
      <button id="alerts-btn" class="btn btn-ghost" type="button">Enable alerts</button>
    </header>

    <main>
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">Low-data heat safety</p>
          <h1 id="hero-title">Work smart when the heat rises.</h1>
          <p class="lede">Made for market traders and roadside vendors who cannot simply close when the afternoon gets hot.</p>
          <div class="location-row" id="location-row"></div>
          <p class="status" id="status" role="status" aria-live="polite"></p>
        </div>
        <div class="risk-card" id="risk-card" aria-live="polite"></div>
      </section>

      <section class="panel" aria-labelledby="plan-title">
        <div class="panel-head">
          <div><p class="eyebrow">Your next break</p><h2 id="plan-title">A plan you can follow</h2></div>
          <span class="pill" id="plan-pill">—</span>
        </div>
        <div class="plan-grid">
          <div class="plan-card">
            <p class="plan-summary" id="plan-summary">Waiting for the forecast.</p>
            <div class="timer-display" id="timer-display">00:00</div>
            <p class="muted" id="timer-note">Start the timer when you begin a break.</p>
            <div class="button-row">
              <button id="timer-toggle" class="btn btn-primary" type="button">Start break timer</button>
              <button id="timer-reset" class="btn btn-soft" type="button">Reset</button>
            </div>
          </div>
          <div class="plan-actions">
            <div class="action-line"><span class="action-icon">W</span><p id="plan-water">Water guidance will appear here.</p></div>
            <div class="action-line"><span class="action-icon">S</span><p id="plan-shade">Shade guidance will appear here.</p></div>
            <div class="checkin-row">
              <button id="water-checkin" class="btn btn-soft" type="button">I drank water</button>
              <button id="shade-checkin" class="btn btn-soft" type="button">I took shade</button>
            </div>
            <p class="muted" id="checkin-count">No check-ins yet today.</p>
          </div>
        </div>
      </section>

      <section class="panel" aria-labelledby="hourly-title">
        <div class="panel-head">
          <div><p class="eyebrow">Next 12 hours</p><h2 id="hourly-title">When the heat peaks</h2></div>
          <p class="peak-line" id="peak-line">—</p>
        </div>
        <div class="hourly-strip" id="hourly-strip"></div>
      </section>

      <section class="panel" aria-labelledby="places-title">
        <div class="panel-head">
          <div><p class="eyebrow">Saved by you</p><h2 id="places-title">Shade and water points</h2></div>
          <p class="muted">Stored on this device only.</p>
        </div>
        <div class="places-grid">
          <form class="place-form" id="place-form">
            <label>Place name<input id="place-name" name="name" maxlength="60" required placeholder="e.g. shaded corner by the main gate" /></label>
            <label>Market or area<input id="place-area" name="area" maxlength="60" placeholder="e.g. Balogun market" /></label>
            <label>Type
              <select id="place-kind" name="kind">
                <option value="shade">Shade</option>
                <option value="water">Water</option>
                <option value="both">Shade and water</option>
              </select>
            </label>
            <label>Note<textarea id="place-note" name="note" maxlength="140" rows="2" placeholder="How to find it"></textarea></label>
            <button class="btn btn-primary" type="submit">Save place</button>
          </form>
          <div class="places-list-wrap">
            <div class="places-list" id="places-list"></div>
            <div class="button-row">
              <button id="demo-places" class="btn btn-soft" type="button">Load examples</button>
              <button id="clear-places" class="btn btn-quiet" type="button">Clear all</button>
            </div>
          </div>
        </div>
      </section>

      <section class="panel safety-panel" aria-labelledby="safety-title">
        <div class="panel-head">
          <div><p class="eyebrow">Know the signs</p><h2 id="safety-title">When to stop and get help</h2></div>
        </div>
        <div class="safety-grid" id="safety-grid"></div>
        <p class="disclaimer" id="disclaimer"></p>
      </section>
    </main>

    <footer>
      <p>Forecast data by Open-Meteo. Guidance only — HeatGuard does not diagnose or treat heat illness.</p>
    </footer>
  `;
}

function renderLocation() {
  const row = app.querySelector('#location-row');
  row.replaceChildren();

  const label = el('span', 'field-label', 'Location');
  const select = el('select', 'select');
  select.id = 'location-select';

  const names = LOCATIONS.map((location) => location.name);
  if (!names.includes(state.location.name)) names.unshift(state.location.name);
  names.forEach((name) => {
    const option = el('option', '', name);
    option.value = name;
    select.append(option);
  });
  select.value = state.location.name;
  select.addEventListener('change', () => {
    const found = LOCATIONS.find((location) => location.name === select.value);
    if (!found) return;
    state.location = found;
    writeJSON('location', found);
    state.weather = null;
    renderWeatherViews();
    loadWeather();
  });

  const geoButton = button('Use my location', () => {
    if (!navigator.geolocation) {
      setStatus('Your browser does not support location detection. Choose a city instead.');
      return;
    }
    setStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.location = {
          name: 'Your location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        writeJSON('location', state.location);
        renderLocation();
        state.weather = null;
        renderWeatherViews();
        loadWeather();
      },
      () => setStatus('Location unavailable. Choose a city instead.'),
      { timeout: 10000 }
    );
  }, 'btn btn-soft');

  row.append(label, select, geoButton);
}

function renderRiskCard() {
  const card = app.querySelector('#risk-card');
  card.replaceChildren();

  if (!state.weather) {
    card.append(el('p', 'risk-kicker', 'Right now'), el('h2', 'risk-label', 'Checking…'), el('p', 'risk-advice', 'Getting the latest heat forecast.'));
    return;
  }

  const risk = riskLevelFromApparent(state.weather.current.apparent, state.inSun);
  const info = RISK_LEVELS[risk];
  card.style.setProperty('--risk-color', info.color);

  const checkbox = el('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'sun-toggle';
  checkbox.checked = state.inSun;
  checkbox.addEventListener('change', () => {
    state.inSun = checkbox.checked;
    writeJSON('inSun', state.inSun);
    renderWeatherViews();
  });

  const sunLabel = el('label', 'toggle');
  sunLabel.htmlFor = 'sun-toggle';
  sunLabel.append(checkbox, el('span', '', 'I am in direct sun'));

  const stats = el('div', 'stats');
  stats.append(
    stat('Air', `${displayNumber(state.weather.current.temp)}°`, 'C'),
    stat('Humidity', `${displayNumber(state.weather.current.humidity)}`, '%'),
    stat('Wind', `${displayNumber(state.weather.current.wind)}`, 'km/h')
  );

  const updated = el('p', 'updated', `Updated ${timeAgo(state.weather.fetchedAt)}${state.weather.stale ? ' · cached' : ''}`);
  const refresh = button('Refresh', () => loadWeather(true), 'btn btn-link');

  card.append(
    el('p', 'risk-kicker', `Feels like in ${state.weather.locationName}`),
    el('h2', 'risk-label', info.label),
    el('p', 'risk-temp', `${displayNumber(state.weather.current.apparent)}°C feels like`),
    el('p', 'risk-advice', info.advice),
    stats,
    sunLabel,
    updated,
    refresh
  );
}

function renderPlan() {
  if (!state.weather) {
    app.querySelector('#plan-pill').textContent = '—';
    app.querySelector('#plan-summary').textContent = 'Waiting for the forecast.';
    app.querySelector('#plan-water').textContent = 'Water guidance will appear here.';
    app.querySelector('#plan-shade').textContent = 'Shade guidance will appear here.';
    app.querySelector('#timer-note').textContent = 'Start the timer when you begin a break.';
    renderCheckins();
    return;
  }

  const risk = riskLevelFromApparent(state.weather.current.apparent, state.inSun);
  const plan = planForRisk(risk);
  const info = RISK_LEVELS[risk];

  app.querySelector('#plan-pill').textContent = info.label;
  app.querySelector('#plan-summary').textContent = plan.summary;
  app.querySelector('#plan-water').textContent = plan.water;
  app.querySelector('#plan-shade').textContent = plan.shade;
  app.querySelector('#timer-note').textContent = `Suggested ${plan.breakMinutes}-minute water and shade break.`;

  if (countdown.currentMinutes !== plan.breakMinutes) {
    countdown.currentMinutes = plan.breakMinutes;
    countdown.setMinutes(plan.breakMinutes);
  }

  renderCheckins();
}

function renderCheckins() {
  const water = Number(state.checkins.water) || 0;
  const shade = Number(state.checkins.shade) || 0;
  const node = app.querySelector('#checkin-count');
  if (!node) return;
  if (water === 0 && shade === 0) node.textContent = 'No check-ins yet today.';
  else node.textContent = `${water} water · ${shade} shade check-ins saved.`;
}

function renderHourly() {
  const strip = app.querySelector('#hourly-strip');
  const peakLine = app.querySelector('#peak-line');
  strip.replaceChildren();

  if (!state.weather) {
    peakLine.textContent = '—';
    return;
  }

  const plan = buildHourlyPlan(state.weather.hourly, state.inSun, state.weather.current.time);
  if (!plan.hours.length) {
    peakLine.textContent = 'No hourly forecast available.';
    return;
  }

  peakLine.textContent = `Peak ${displayNumber(plan.peak.apparent)}°C around ${formatHour(plan.peak.time)}`;

  plan.hours.forEach((hour) => {
    const info = RISK_LEVELS[hour.level];
    const cell = el('div', 'hour-cell');
    cell.style.setProperty('--cell-color', info.color);
    cell.append(
      el('span', 'hour-time', formatHour(hour.time)),
      el('strong', 'hour-temp', `${displayNumber(hour.apparent)}°`),
      el('span', 'hour-level', info.short)
    );
    strip.append(cell);
  });
}

function renderPlaces() {
  const list = app.querySelector('#places-list');
  list.replaceChildren();
  const places = listPlaces();

  if (!places.length) {
    list.append(el('p', 'empty', 'No saved places yet. Add a shaded spot or water point you trust.'));
    return;
  }

  places.forEach((place) => {
    const row = el('div', 'place-row');
    const main = el('div', 'place-main');
    const title = el('div', 'place-title');
    title.append(el('strong', '', place.name), el('span', 'tag', place.kind === 'both' ? 'shade + water' : place.kind));
    if (place.demo) title.append(el('span', 'tag tag-demo', 'demo'));
    main.append(title);
    if (place.area) main.append(el('p', 'place-meta', place.area));
    if (place.note) main.append(el('p', 'place-note', place.note));
    row.append(main, button('Remove', () => { removePlace(place.id); renderPlaces(); }, 'btn btn-quiet'));
    list.append(row);
  });
}

function renderSafety() {
  const grid = app.querySelector('#safety-grid');
  grid.replaceChildren();

  const groups = [
    { title: 'Watch for', items: WARNING_SIGNS, className: 'safety-card' },
    { title: 'Emergency signs', items: EMERGENCY_SIGNS, className: 'safety-card safety-urgent' },
    { title: 'What to do', items: ACTION_STEPS, className: 'safety-card' }
  ];

  groups.forEach((group) => {
    const card = el('div', group.className);
    card.append(el('h3', '', group.title));
    const list = el('ul');
    group.items.forEach((item) => list.append(el('li', '', item)));
    card.append(list);
    grid.append(card);
  });

  app.querySelector('#disclaimer').textContent = DISCLAIMER;
}

function renderWeatherViews() {
  renderRiskCard();
  renderPlan();
  renderHourly();
}

async function loadWeather(force = false) {
  setStatus('Checking the latest heat forecast…');
  try {
    state.weather = await getWeather(state.location, { force });
    renderWeatherViews();
    if (state.weather.stale) {
      setStatus('Showing the last saved forecast. Refresh when you have data.');
    } else {
      setStatus('');
    }
  } catch {
    renderWeatherViews();
    setStatus('Weather is unavailable right now. Check your connection and try again.');
  }
}

function notify(title, message) {
  let alertBlocked = false;
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  } catch {
    alertBlocked = true;
  }
  setStatus(alertBlocked ? `${message} Browser alert was blocked.` : message);
}

const countdown = createCountdown({
  onUpdate(remaining) {
    const display = app.querySelector('#timer-display');
    const toggle = app.querySelector('#timer-toggle');
    if (display) display.textContent = formatCountdown(remaining);
    if (toggle) toggle.textContent = countdown.isRunning() ? 'Pause timer' : remaining === 0 ? 'Timer finished' : 'Start break timer';
  },
  onComplete() {
    notify('Break finished', 'Check the shade and water guidance, then continue when you are ready.');
  }
});

function attachListeners() {
  app.querySelector('#alerts-btn').addEventListener('click', async () => {
    if (!('Notification' in window)) {
      setStatus('This browser does not support alerts. The in-app timer still works.');
      return;
    }
    const permission = await Notification.requestPermission();
    setStatus(permission === 'granted' ? 'Alerts enabled.' : 'Alerts not enabled. The in-app timer still works.');
  });

  app.querySelector('#timer-toggle').addEventListener('click', () => {
    if (countdown.isRunning()) countdown.pause();
    else countdown.start();
  });

  app.querySelector('#timer-reset').addEventListener('click', () => countdown.reset());

  app.querySelector('#water-checkin').addEventListener('click', () => {
    state.checkins.date = todayKey();
    state.checkins.water = (Number(state.checkins.water) || 0) + 1;
    writeJSON('checkins', state.checkins);
    renderCheckins();
    setStatus('Water check-in saved.');
  });

  app.querySelector('#shade-checkin').addEventListener('click', () => {
    state.checkins.date = todayKey();
    state.checkins.shade = (Number(state.checkins.shade) || 0) + 1;
    writeJSON('checkins', state.checkins);
    renderCheckins();
    setStatus('Shade check-in saved.');
  });

  app.querySelector('#place-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const place = addPlace({
      name: form.elements.name.value,
      kind: form.elements.kind.value,
      area: form.elements.area.value,
      note: form.elements.note.value
    });
    if (!place) return;
    form.reset();
    renderPlaces();
    setStatus('Place saved on this device.');
  });

  app.querySelector('#demo-places').addEventListener('click', () => {
    loadDemoPlaces();
    renderPlaces();
    setStatus('Example places loaded. They are marked as demo.');
  });

  app.querySelector('#clear-places').addEventListener('click', () => {
    if (!window.confirm('Remove all saved shade and water points from this device?')) return;
    clearPlaces();
    renderPlaces();
    setStatus('Saved places cleared.');
  });
}

renderShell();
renderLocation();
renderPlaces();
renderSafety();
attachListeners();
loadWeather();
setInterval(() => loadWeather(true), 10 * 60 * 1000);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
