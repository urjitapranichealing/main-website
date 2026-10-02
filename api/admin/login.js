// POST /api/admin/login  { password }
import { route, HttpError } from '../_lib/http.js';
import { checkPassword, startSession } from '../_lib/auth.js';

const pause = ms => new Promise(r => setTimeout(r, ms));

export default route({
  async POST(req, res) {
    if (!process.env.ADMIN_PASSWORD) {
      throw new HttpError(503, 'The admin password has not been set up yet. Add ADMIN_PASSWORD in Vercel and redeploy.');
    }
    const { password } = req.body || {};
    if (!checkPassword(password)) {
      await pause(800);               // slows down guessing
      throw new HttpError(401, 'That password is not right. Please try again.');
    }
    startSession(res);
    return { ok: true };
  },
});
