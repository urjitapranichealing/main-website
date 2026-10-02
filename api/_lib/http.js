// Shared request plumbing for every API route.
import { isAdmin } from './auth.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function friendly(err) {
  const msg = String((err && err.message) || '');
  const name = String((err && err.name) || '');
  if (/token|BLOB_|store/i.test(msg) || /^Blob/.test(name)) {
    return 'Storage is not connected yet. In Vercel, create a Public Blob store and connect it to this project, then redeploy.';
  }
  return 'Something went wrong on the server. Please try again in a minute.';
}

/**
 * route({ GET, POST, ... }, { admin })
 * Wraps handlers with method checks, admin checks and consistent JSON errors.
 */
export function route(handlers, { admin = false } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const fn = handlers[req.method];
      if (!fn) throw new HttpError(405, 'That action is not allowed here.');

      if (admin) {
        if (!isAdmin(req)) throw new HttpError(401, 'Your session has ended. Please log in again.');
        const ct = req.headers['content-type'] || '';
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && !ct.includes('application/json')) {
          throw new HttpError(415, 'Unexpected request format.');
        }
      }

      const out = await fn(req, res);
      if (!res.headersSent) res.status(200).json(out === undefined ? { ok: true } : out);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error(err);
      res.status(status).json({ error: status >= 500 ? friendly(err) : err.message });
    }
  };
}

export const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
