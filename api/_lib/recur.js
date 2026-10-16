// Recurring-event maths. Dates are plain 'YYYY-MM-DD' strings, handled in UTC so that
// adding days never drifts across time zones. "Today" is always today in India.
//
// Rule shape (stored on the event as `repeat`):
// {
//   freq:      'none' | 'daily' | 'weekly' | 'monthly',
//   interval:  1..12              every N days / weeks / months
//   days:      [0..6]             weekly only: 0 = Sunday ... 6 = Saturday
//   monthMode: 'date' | 'weekday' monthly only: "on the 15th" or "on the third Saturday"
//   ends:      'never' | 'on' | 'after'
//   until:     'YYYY-MM-DD'       when ends === 'on'
//   count:     1..365             when ends === 'after'
// }

const DAY = 86400000;
const MAX_STEPS = 5000;

export const toDate = iso => new Date(iso + 'T00:00:00Z');
export const toISO = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export function todayIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

// e.g. 2026-10-17 is the third Saturday -> 3. The fifth occurrence is treated as "last".
export function nthOfMonth(iso) {
  const n = Math.ceil(toDate(iso).getUTCDate() / 7);
  return n >= 5 ? -1 : n;
}

function nthWeekday(y, m, weekday, nth) {
  if (nth === -1) {
    const last = new Date(Date.UTC(y, m, daysInMonth(y, m)));
    return addDays(last, -((last.getUTCDay() - weekday + 7) % 7));
  }
  const first = new Date(Date.UTC(y, m, 1));
  const d = addDays(first, (weekday - first.getUTCDay() + 7) % 7 + (nth - 1) * 7);
  return d.getUTCMonth() === m ? d : null;   // e.g. no 5th Monday this month
}

/** Every start date in the series, in order, as ISO strings. Lazy, so it can stop early. */
export function* series(ev) {
  const rule = ev.repeat || { freq: 'none' };
  const start = toDate(ev.date);
  const until = rule.ends === 'on' && rule.until ? toDate(rule.until) : null;
  const limit = rule.ends === 'after' ? Math.max(1, rule.count || 1) : Infinity;
  const step = Math.max(1, rule.interval || 1);
  let emitted = 0;

  const emit = function* (d) {
    if (until && d > until) return false;
    if (emitted >= limit) return false;
    emitted++;
    yield toISO(d);
    return true;
  };

  if (!rule.freq || rule.freq === 'none') { yield ev.date; return; }

  if (rule.freq === 'daily') {
    for (let k = 0; k < MAX_STEPS; k++) {
      if (!(yield* emit(addDays(start, k * step)))) return;
    }
    return;
  }

  if (rule.freq === 'weekly') {
    const days = (rule.days && rule.days.length ? rule.days : [start.getUTCDay()])
      .map(Number).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));        // Monday-first order
    const monday = addDays(start, -((start.getUTCDay() + 6) % 7));
    for (let w = 0; w < MAX_STEPS; w += step) {
      for (const wd of days) {
        const d = addDays(monday, w * 7 + ((wd + 6) % 7));
        if (d < start) continue;
        if (!(yield* emit(d))) return;
      }
    }
    return;
  }

  if (rule.freq === 'monthly') {
    const y0 = start.getUTCFullYear(), m0 = start.getUTCMonth(), dom = start.getUTCDate();
    const wd = start.getUTCDay(), nth = nthOfMonth(ev.date);
    for (let k = 0; k < MAX_STEPS; k++) {
      const total = m0 + k * step;
      const y = y0 + Math.floor(total / 12), m = total % 12;
      const d = rule.monthMode === 'weekday'
        ? nthWeekday(y, m, wd, nth)
        : new Date(Date.UTC(y, m, Math.min(dom, daysInMonth(y, m))));   // 31st -> last day in short months
      if (!d) continue;
      if (!(yield* emit(d))) return;
    }
  }
}

/**
 * Where the event stands relative to today.
 *   next:  the date to show (the running or next session), or null when the series is over
 *   ended: true when nothing is left on or after today
 */
export function status(ev, today = todayIndia()) {
  const span = ev.endDate && (!ev.repeat || ev.repeat.freq === 'none')
    ? Math.round((toDate(ev.endDate) - toDate(ev.date)) / DAY) : 0;
  let last = null;
  for (const iso of series(ev)) {
    const finish = toISO(addDays(toDate(iso), span));
    if (finish >= today) return { next: iso, ended: false, last: null };
    last = iso;
  }
  return { next: null, ended: true, last };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Clean and validate a rule from the dashboard. Throws a plain message on bad input. */
export function normaliseRule(input, startISO) {
  const r = input || {};
  const freq = ['daily', 'weekly', 'monthly'].includes(r.freq) ? r.freq : 'none';
  if (freq === 'none') return { freq: 'none' };

  const rule = { freq, interval: Math.min(12, Math.max(1, parseInt(r.interval, 10) || 1)) };

  if (freq === 'weekly') {
    const days = [...new Set((Array.isArray(r.days) ? r.days : []).map(Number))]
      .filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
    rule.days = days.length ? days : [toDate(startISO).getUTCDay()];
  }
  if (freq === 'monthly') rule.monthMode = r.monthMode === 'weekday' ? 'weekday' : 'date';

  rule.ends = ['on', 'after'].includes(r.ends) ? r.ends : 'never';
  if (rule.ends === 'on') {
    if (!DATE_RE.test(r.until || '')) throw new Error('Please choose the date the repeating event ends.');
    if (r.until < startISO) throw new Error('The repeat end date cannot be before the first date.');
    rule.until = r.until;
  }
  if (rule.ends === 'after') {
    const c = parseInt(r.count, 10);
    if (!(c >= 1 && c <= 365)) throw new Error('Please say how many times the event repeats (1 to 365).');
    rule.count = c;
  }
  return rule;
}
