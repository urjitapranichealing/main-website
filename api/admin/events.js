// ADMIN: manage events
//   GET                                                   -> { events }   (with next / ended worked out)
//   POST   { event, imageUrl }                            create
//   PUT    { id, event, imageUrl, removeImage }           update
//   PATCH  { id, status }                                 move between upcoming / past
//   DELETE ?id=...                                        delete
import crypto from 'node:crypto';
import { route, HttpError } from '../_lib/http.js';
import { readJSON, writeJSON, saveImage, removeImage, isOwnedImage } from '../_lib/store.js';
import { EVENTS_FILE, normaliseEvent, sortedForAdmin, stored } from '../_lib/events.js';

const load = async () => (await readJSON(EVENTS_FILE, [])).map(stored);

function find(all, id) {
  const i = all.findIndex(e => e.id === id);
  if (i < 0) throw new HttpError(404, 'That event no longer exists. Refresh the page.');
  return i;
}

async function photoFrom({ imageUrl, imageData }) {
  if (imageUrl) {
    if (!isOwnedImage(imageUrl, 'events')) throw new HttpError(400, 'Please upload the photo again.');
    return imageUrl;
  }
  if (imageData) return saveImage(imageData, 'events');   // older single-step uploads still work
  return null;
}

export default route({
  async GET() {
    return { events: sortedForAdmin(await load()) };
  },

  async POST(req) {
    const body = req.body || {};
    const all = await load();
    const ev = normaliseEvent(body.event);
    ev.id = crypto.randomUUID();
    ev.createdAt = ev.updatedAt = new Date().toISOString();
    const photo = await photoFrom(body);
    if (photo) ev.image = photo;
    all.push(ev);
    await writeJSON(EVENTS_FILE, all);
    return { event: ev, events: sortedForAdmin(all) };
  },

  async PUT(req) {
    const body = req.body || {};
    const all = await load();
    const i = find(all, body.id);
    const before = all[i];
    const ev = normaliseEvent(body.event, before);
    ev.updatedAt = new Date().toISOString();
    const photo = await photoFrom(body);
    if (photo && photo !== before.image) {
      ev.image = photo;
      await removeImage(before.image);
    } else if (!photo && body.removeImage) {
      await removeImage(before.image);
      delete ev.image;
    }
    all[i] = ev;
    await writeJSON(EVENTS_FILE, all);
    return { event: ev, events: sortedForAdmin(all) };
  },

  async PATCH(req) {
    const { id, status } = req.body || {};
    const all = await load();
    const i = find(all, id);
    all[i].status = status === 'past' ? 'past' : 'upcoming';
    all[i].updatedAt = new Date().toISOString();
    await writeJSON(EVENTS_FILE, all);
    return { event: all[i], events: sortedForAdmin(all) };
  },

  async DELETE(req) {
    const id = req.query && req.query.id;
    const all = await load();
    const i = find(all, id);
    const [gone] = all.splice(i, 1);
    await writeJSON(EVENTS_FILE, all);
    await removeImage(gone.image);
    return { events: sortedForAdmin(all) };
  },
}, { admin: true });
