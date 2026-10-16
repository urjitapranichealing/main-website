import { HttpError, clean } from './http.js';
import { normaliseRule, status, todayIndia } from './recur.js';

export const EVENTS_FILE = 'data/events.json';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):(00|15|30|45)$/;   // the dashboard only offers quarter hours

function httpsUrl(v, label) {
  const u = clean(v, 500);
  if (u && !/^https:\/\/\S+$/i.test(u)) throw new HttpError(400, `The ${label} should start with https://`);
  return u;
}

export function normaliseEvent(input = {}, existing = {}) {
  const ev = {
    ...existing,
    title:          clean(input.title, 140),
    title_mr:       clean(input.title_mr, 140),
    date:           clean(input.date, 10),
    endDate:        clean(input.endDate, 10),
    startTime:      clean(input.startTime, 5),
    endTime:        clean(input.endTime, 5),
    venue:          clean(input.venue, 140),
    location:       clean(input.location, 140),
    mapLink:        httpsUrl(input.mapLink, 'Google Maps link'),
    description:    clean(input.description, 3000),
    description_mr: clean(input.description_mr, 3000),
    link:           httpsUrl(input.link, 'registration link'),
    status:         input.status === 'past' ? 'past' : 'upcoming',
  };

  // Older events had free-text times. They keep it only until a time is chosen from the lists.
  delete ev.time;
  if (existing.time && !ev.startTime && input.keepOldTime) ev.time = existing.time;

  if (!ev.title) throw new HttpError(400, 'Please give the event a name.');
  if (!DATE_RE.test(ev.date)) throw new HttpError(400, 'Please choose the date of the event.');

  if (ev.startTime && !TIME_RE.test(ev.startTime)) throw new HttpError(400, 'Please choose a start time from the list.');
  if (ev.endTime && !TIME_RE.test(ev.endTime)) throw new HttpError(400, 'Please choose an end time from the list.');
  if (ev.endTime && !ev.startTime) throw new HttpError(400, 'Please choose a start time as well as an end time.');

  try {
    ev.repeat = normaliseRule(input.repeat, ev.date);
  } catch (e) {
    throw new HttpError(400, e.message);
  }

  if (ev.repeat.freq !== 'none') ev.endDate = '';   // each repeat is a single day
  if (ev.endDate) {
    if (!DATE_RE.test(ev.endDate)) throw new HttpError(400, 'Please choose a valid end date.');
    if (ev.endDate < ev.date) throw new HttpError(400, 'The end date cannot be before the start date.');
    if (ev.endDate === ev.date) ev.endDate = '';
  }
  if (!ev.endDate && ev.startTime && ev.endTime && ev.endTime <= ev.startTime) {
    throw new HttpError(400, 'The end time must be later than the start time.');
  }
  if (ev.repeat.freq === 'none') delete ev.repeat;
  if (!ev.endDate) delete ev.endDate;
  return ev;
}

/** Adds { next, ended, last } for display. Never stored. */
export function annotate(ev, today = todayIndia()) {
  return { ...ev, ...status(ev, today) };
}

const sortKey = e => e.next || e.last || e.date;

export function sortedForAdmin(all) {
  const today = todayIndia();
  return all.map(e => annotate(e, today)).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

/** Strip the display-only fields before saving. */
export function stored(ev) {
  const { next, ended, last, ...rest } = ev;
  return rest;
}

const PUBLIC_FIELDS = ['id', 'title', 'title_mr', 'date', 'endDate', 'startTime', 'endTime', 'time',
  'venue', 'location', 'mapLink', 'description', 'description_mr', 'link', 'image', 'status',
  'repeat', 'next', 'ended', 'last'];

function pick(ev) {
  const out = {};
  for (const k of PUBLIC_FIELDS) if (ev[k] !== undefined && ev[k] !== '' && ev[k] !== null) out[k] = ev[k];
  return out;
}

export function splitForPublic(all = []) {
  const today = todayIndia();
  const shown = all.map(e => annotate(e, today));
  const upcoming = shown.filter(e => e.status !== 'past')
    // live dates first, soonest first; anything already over drops to the end
    .sort((a, b) => (a.ended - b.ended) || sortKey(a).localeCompare(sortKey(b)))
    .map(pick);
  const past = shown.filter(e => e.status === 'past')
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
    .map(pick);
  return { upcoming, past };
}
