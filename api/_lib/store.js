// All persistent data lives in a PUBLIC Vercel Blob store:
//   data/events.json, data/gallery.json  - the content
//   events/*, gallery/*                  - the photos
import { put, list, del } from '@vercel/blob';
import { HttpError } from './http.js';

const ACCESS = 'public';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function readJSON(pathname, fallback) {
  const { blobs } = await list({ prefix: pathname, limit: 20 });
  const hit = blobs.find(b => b.pathname === pathname);
  if (!hit) return fallback;
  // Blobs are cached by the CDN; the upload time in the query string always fetches the newest copy.
  const stamp = new Date(hit.uploadedAt).getTime();
  const res = await fetch(`${hit.url}?v=${stamp}`, { cache: 'no-store' });
  if (!res.ok) return fallback;
  return res.json();
}

export async function writeJSON(pathname, data) {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export async function saveImage(dataUrl, folder) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new HttpError(400, 'Please choose a JPG, PNG or WebP photo.');
  const bytes = Buffer.from(m[2], 'base64');
  if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'That photo is too large. Please choose a smaller one.');
  const ext = m[1] === 'image/jpeg' ? 'jpg' : m[1].split('/')[1];
  const blob = await put(`${folder}/photo.${ext}`, bytes, {
    access: ACCESS,
    addRandomSuffix: true,
    contentType: m[1],
  });
  return blob.url;
}

/** True only for photos this site uploaded into the given folder of its own Blob store. */
export function isOwnedImage(url, folder) {
  if (typeof url !== 'string' || url.length > 600) return false;
  const dev = process.env.URJITA_DEV_BLOB_BASE;           // local testing only; never set on Vercel
  if (dev && url.startsWith(dev + folder + '/')) return true;
  return new RegExp('^https://[a-z0-9-]+\\.public\\.blob\\.vercel-storage\\.com/' + folder + '/[^?#\\s]+$', 'i').test(url);
}

export async function removeImage(url) {
  if (!url || !(isOwnedImage(url, 'events') || isOwnedImage(url, 'gallery'))) return;
  try { await del(url); } catch (e) { console.warn('Could not delete old image', e && e.message); }
}
