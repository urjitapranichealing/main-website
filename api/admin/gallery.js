// ADMIN: manage the home-page gallery (maximum 15 photos)
//   GET                          -> { photos, max }
//   POST   { imageData, caption }     add a photo
//   PUT    { order: [ids] }           reorder
//   PUT    { id, caption }            change a caption
//   DELETE ?id=...                    remove a photo
import crypto from 'node:crypto';
import { route, HttpError, clean } from '../_lib/http.js';
import { readJSON, writeJSON, saveImage, removeImage } from '../_lib/store.js';

const FILE = 'data/gallery.json';
const MAX = 15;
const load = () => readJSON(FILE, []);

export default route({
  async GET() {
    return { photos: await load(), max: MAX };
  },

  async POST(req) {
    const { imageData, caption } = req.body || {};
    const photos = await load();
    if (photos.length >= MAX) {
      throw new HttpError(400, `The gallery already has ${MAX} photos. Remove one before adding another.`);
    }
    const url = await saveImage(imageData, 'gallery');
    photos.push({ id: crypto.randomUUID(), url, caption: clean(caption, 160), addedAt: new Date().toISOString() });
    await writeJSON(FILE, photos);
    return { photos, max: MAX };
  },

  async PUT(req) {
    const { order, id, caption } = req.body || {};
    let photos = await load();
    if (Array.isArray(order)) {
      const byId = new Map(photos.map(p => [p.id, p]));
      const next = order.map(x => byId.get(x)).filter(Boolean);
      photos.forEach(p => { if (!order.includes(p.id)) next.push(p); });
      photos = next;
    } else {
      const p = photos.find(x => x.id === id);
      if (!p) throw new HttpError(404, 'That photo no longer exists. Refresh the page.');
      p.caption = clean(caption, 160);
    }
    await writeJSON(FILE, photos);
    return { photos, max: MAX };
  },

  async DELETE(req) {
    const id = req.query && req.query.id;
    const photos = await load();
    const i = photos.findIndex(p => p.id === id);
    if (i < 0) throw new HttpError(404, 'That photo no longer exists. Refresh the page.');
    const [gone] = photos.splice(i, 1);
    await writeJSON(FILE, photos);
    await removeImage(gone.url);
    return { photos, max: MAX };
  },
}, { admin: true });
