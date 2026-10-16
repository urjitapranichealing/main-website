// ADMIN: the home-page gallery (maximum 15 photos)
//   GET                            -> { photos, max }
//   POST   { url, caption }        save an uploaded photo into the gallery
//   PUT    { order: [ids] }        reorder
//   PUT    { id, caption }         change a caption
//   DELETE ?id=...                 remove a photo
import crypto from 'node:crypto';
import { route, HttpError, clean } from '../_lib/http.js';
import { readJSON, writeJSON, saveImage, removeImage, isOwnedImage } from '../_lib/store.js';

const FILE = 'data/gallery.json';
const MAX = 15;
const load = () => readJSON(FILE, []);

export default route({
  async GET() {
    return { photos: await load(), max: MAX };
  },

  async POST(req) {
    const { url, imageData, caption } = req.body || {};
    const photos = await load();
    if (photos.length >= MAX) {
      throw new HttpError(400, `The gallery already has ${MAX} photos. Remove one before adding another.`);
    }
    let finalUrl;
    if (url) {
      if (!isOwnedImage(url, 'gallery')) throw new HttpError(400, 'Please upload the photo again.');
      if (photos.some(p => p.url === url)) throw new HttpError(400, 'That photo is already in the gallery.');
      finalUrl = url;
    } else {
      finalUrl = await saveImage(imageData, 'gallery');   // older single-step uploads still work
    }
    const photo = { id: crypto.randomUUID(), url: finalUrl, caption: clean(caption, 160), addedAt: new Date().toISOString() };
    photos.push(photo);
    await writeJSON(FILE, photos);
    return { photo, photos, max: MAX };
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
