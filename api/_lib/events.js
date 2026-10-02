import { HttpError, clean } from './http.js';

export const EVENTS_FILE = 'data/events.json';

export function normaliseEvent(input = {}, existing = {}) {
  const ev = {
    ...existing,
    title:          clean(input.title, 140),
    title_mr:       clean(input.title_mr, 140),
    date:           clean(input.date, 10),
    time:           clean(input.time, 60),
    venue:          clean(input.venue, 140),
    location:       clean(input.location, 140),
    description:    clean(input.description, 3000),
    description_mr: clean(input.description_mr, 3000),
    link:           clean(input.link, 400),
    status:         input.status === 'past' ? 'past' : 'upcoming',
  };
  if (!ev.title) throw new HttpError(400, 'Please give the event a name.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) throw new HttpError(400, 'Please choose the date of the event.');
  if (ev.link && !/^https?:\/\//i.test(ev.link)) {
    throw new HttpError(400, 'The registration link should start with https://');
  }
  return ev;
}

const PUBLIC_FIELDS = ['id', 'title', 'title_mr', 'date', 'time', 'venue', 'location',
  'description', 'description_mr', 'link', 'image', 'status'];

function pick(ev) {
  const out = {};
  for (const k of PUBLIC_FIELDS) if (ev[k]) out[k] = ev[k];
  return out;
}

export function splitForPublic(all = []) {
  const upcoming = all.filter(e => e.status !== 'past')
    .sort((a, b) => a.date.localeCompare(b.date)).map(pick);
  const past = all.filter(e => e.status === 'past')
    .sort((a, b) => b.date.localeCompare(a.date)).map(pick);
  return { upcoming, past };
}
