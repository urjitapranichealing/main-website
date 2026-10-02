// Password login with a signed, HttpOnly session cookie.
// The only secret is ADMIN_PASSWORD, set in Vercel -> Settings -> Environment Variables.
// Changing that password logs everyone out immediately.
import crypto from 'node:crypto';

const COOKIE = 'urjita_admin';
const TTL_SECONDS = 12 * 60 * 60; // 12 hours

const password = () => process.env.ADMIN_PASSWORD || '';
const key = () => crypto.createHash('sha256').update('urjita-session|' + password()).digest();
const sign = value => crypto.createHmac('sha256', key()).update(value).digest('base64url');

export function checkPassword(input) {
  const real = password();
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export function startSession(res) {
  const expires = String(Math.floor(Date.now() / 1000) + TTL_SECONDS);
  res.setHeader('Set-Cookie',
    `${COOKIE}=${expires}.${sign(expires)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL_SECONDS}`);
}

export function endSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
}

export function isAdmin(req) {
  if (!password()) return false;
  const raw = req.headers.cookie || '';
  const pair = raw.split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!pair) return false;
  const [expires, sig] = pair.slice(COOKIE.length + 1).split('.');
  if (!expires || !sig) return false;
  const expected = Buffer.from(sign(expires));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  return Number(expires) > Date.now() / 1000;
}
