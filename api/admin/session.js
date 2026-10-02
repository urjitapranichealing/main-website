// GET /api/admin/session  ->  { loggedIn: true|false }
import { route } from '../_lib/http.js';
import { isAdmin } from '../_lib/auth.js';

export default route({
  async GET(req) {
    return { loggedIn: isAdmin(req) };
  },
});
