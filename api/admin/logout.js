// POST /api/admin/logout
import { route } from '../_lib/http.js';
import { endSession } from '../_lib/auth.js';

export default route({
  async POST(req, res) {
    endSession(res);
    return { ok: true };
  },
});
