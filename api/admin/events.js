// ADMIN: manage events
//   GET                       -> { events }
//   POST   { event, imageData }               create
//   PUT    { id, event, imageData, removeImage }  update
//   PATCH  { id, status }                      move between upcoming / past
//   DELETE ?id=...                             delete
import crypto from 'node:crypto';
import { route, HttpError } from '../_lib/http.js';
import { readJSON, writeJSON, saveImage, removeImage } from '../_lib/store.js';
import { EVENTS_FILE, normaliseEvent } from '../_lib/events.js';

const load = () => readJSON(EVENTS_FILE, []);
const sorted = all => [...all].sort((a, b) => a.date.localeCompare(b.date));

function find(all, id) {
  const i = all.findIndex(e => e.id === id);
  if (i < 0) throw new HttpError(404, 'That event no longer exists. Refresh the page.');
  return i;
}

export default route({
  async GET() {
    return { events: sorted(await load()) };
  },

  async POST(req) {
    const { event, imageData } = req.body || {};
    const all = await load();
    const ev = normaliseEvent(event);
    ev.id = crypto.randomUUID();
    ev.createdAt = ev.updatedAt = new Date().toISOString();
    if (imageData) ev.image = await saveImage(imageData, 'events');
    all.push(ev);
    await writeJSON(EVENTS_FILE, all);
    return { event: ev, events: sorted(all) };
  },

  async PUT(req) {
    const { id, event, imageData, removeImage: dropImage } = req.body || {};
    const all = await load();
    const i = find(all, id);
    const before = all[i];
    const ev = normaliseEvent(event, before);
    ev.updatedAt = new Date().toISOString();
    if (imageData) {
      ev.image = await saveImage(imageData, 'events');
      await removeImage(before.image);
    } else if (dropImage) {
      await removeImage(before.image);
      delete ev.image;
    }
    all[i] = ev;
    await writeJSON(EVENTS_FILE, all);
    return { event: ev, events: sorted(all) };
  },

  async PATCH(req) {
    const { id, status } = req.body || {};
    const all = await load();
    const i = find(all, id);
    all[i].status = status === 'past' ? 'past' : 'upcoming';
    all[i].updatedAt = new Date().toISOString();
    await writeJSON(EVENTS_FILE, all);
    return { event: all[i], events: sorted(all) };
  },

  async DELETE(req) {
    const id = req.query && req.query.id;
    const all = await load();
    const i = find(all, id);
    const [gone] = all.splice(i, 1);
    await writeJSON(EVENTS_FILE, all);
    await removeImage(gone.image);
    return { events: sorted(all) };
  },
}, { admin: true });
