// ADMIN: step one of adding a photo. The dashboard shows a progress bar while this runs,
// then the photo is attached to an event or gallery entry when the manager presses Save.
//   POST   { imageData, folder: 'gallery' | 'events' }  -> { url }
//   DELETE ?url=...   discard an upload that was never saved (refuses if anything still uses it)
import { route, HttpError } from '../_lib/http.js';
import { readJSON, saveImage, removeImage, isOwnedImage } from '../_lib/store.js';
import { EVENTS_FILE } from '../_lib/events.js';

const FOLDERS = ['gallery', 'events'];

export default route({
  async POST(req) {
    const { imageData, folder } = req.body || {};
    if (!FOLDERS.includes(folder)) throw new HttpError(400, 'Unknown upload type.');
    return { url: await saveImage(imageData, folder) };
  },

  async DELETE(req) {
    const url = req.query && req.query.url;
    if (!FOLDERS.some(f => isOwnedImage(url, f))) throw new HttpError(400, 'That is not one of this site’s photos.');
    const [events, gallery] = await Promise.all([readJSON(EVENTS_FILE, []), readJSON('data/gallery.json', [])]);
    if (events.some(e => e.image === url) || gallery.some(p => p.url === url)) return { ok: true, kept: true };
    await removeImage(url);
    return { ok: true };
  },
}, { admin: true });
