// PUBLIC: GET /api/events  ->  { upcoming: [...], past: [...] }
import { route } from './_lib/http.js';
import { readJSON } from './_lib/store.js';
import { EVENTS_FILE, splitForPublic } from './_lib/events.js';

export default route({
  async GET(req, res) {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    try {
      return splitForPublic(await readJSON(EVENTS_FILE, []));
    } catch (e) {
      console.error(e);
      return { upcoming: [], past: [] };   // never break the public page
    }
  },
});
