// PUBLIC: GET /api/gallery  ->  { photos: [{ id, url, caption }] }
import { route } from './_lib/http.js';
import { readJSON } from './_lib/store.js';

const GALLERY_FILE = 'data/gallery.json';

export default route({
  async GET(req, res) {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    try {
      const photos = await readJSON(GALLERY_FILE, []);
      return { photos: photos.map(({ id, url, caption }) => ({ id, url, caption: caption || '' })) };
    } catch (e) {
      console.error(e);
      return { photos: [] };
    }
  },
});
