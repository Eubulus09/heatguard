export const RISK_LEVELS = {
  normal: {
    label: 'Lower risk',
    short: 'Lower',
    color: '#2f7d5b',
    advice: 'A good window for errands. Keep water close.'
  },
  caution: {
    label: 'Caution',
    short: 'Caution',
    color: '#8a5a00',
    advice: 'Sip water regularly and take a short shade break.'
  },
  high: {
    label: 'High heat',
    short: 'High',
    color: '#a33a0b',
    advice: 'Take a shade break every 45 minutes and drink water often.'
  },
  danger: {
    label: 'Danger',
    short: 'Danger',
    color: '#9b1c1c',
    advice: 'Move to shade now. Reschedule heavy work if you can.'
  }
};

const ORDER = ['normal', 'caution', 'high', 'danger'];
const THRESHOLDS = [27, 32, 39];

export function riskLevelFromApparent(value, inSun = false) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'normal';

  let index = 0;
  if (number >= THRESHOLDS[2]) index = 3;
  else if (number >= THRESHOLDS[1]) index = 2;
  else if (number >= THRESHOLDS[0]) index = 1;

  if (inSun && index < ORDER.length - 1) index += 1;
  return ORDER[index];
}

export function planForRisk(level) {
  const plans = {
    normal: {
      breakMinutes: 90,
      water: 'Keep a bottle within reach.',
      shade: 'Take an easy break when you can.',
      summary: 'A calmer window for trading and errands.'
    },
    caution: {
      breakMinutes: 60,
      water: 'Sip water every 30 minutes.',
      shade: 'Take 5 minutes under shade each hour.',
      summary: 'Steady heat. Build small breaks into your routine.'
    },
    high: {
      breakMinutes: 45,
      water: 'Drink water often, even before you feel thirsty.',
      shade: 'Take 10 minutes under shade each hour.',
      summary: 'Heavy trading is harder now. Slow down where possible.'
    },
    danger: {
      breakMinutes: 30,
      water: 'Keep water close and sip if you are alert.',
      shade: 'Move to shade now and avoid heavy work.',
      summary: 'The hottest window. Prioritise shade and lighter tasks.'
    }
  };

  return plans[level] || plans.normal;
}

export function buildHourlyPlan(hourly, inSun = false, currentTime = '') {
  const rows = Array.isArray(hourly) ? hourly : [];
  const start = currentTime ? rows.findIndex((row) => row.time >= currentTime) : 0;
  const from = start >= 0 ? start : 0;
  const hours = rows.slice(from, from + 12).map((row) => ({
    time: row.time,
    apparent: Number(row.apparent),
    temp: Number(row.temp),
    level: riskLevelFromApparent(row.apparent, inSun)
  }));

  const peak = hours.reduce((best, row) => (row.apparent > best.apparent ? row : best), hours[0] || null);
  return { hours, peak };
}

export function formatHour(time) {
  if (!time || typeof time !== 'string') return '—';
  const clock = time.split('T')[1] || '';
  const [hourText, minuteText] = clock.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return '—';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${minuteText && minuteText !== '00' ? `:${minuteText}` : ''} ${suffix}`;
}
