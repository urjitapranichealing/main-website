/* ============================================================
   URJITA — website manager
   Talks to /api/admin/*. Everything is plain DOM; no libraries.
   ============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- feedback ---------- */
  let toastTimer;
  function toast(msg, bad) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('bad', !!bad);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), bad ? 5000 : 2600);
  }
  function busy(on, msg) {
    $('busy').hidden = !on;
    if (msg) $('busy-msg').textContent = msg;
  }

  /* ---------- API ---------- */
  async function api(path, method = 'GET', body) {
    const opts = { method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let res, data = {};
    try {
      res = await fetch(path, opts);
      data = await res.json().catch(() => ({}));
    } catch (e) {
      throw new Error('Could not reach the website. Check your internet connection.');
    }
    if (res.status === 401 && path !== '/api/admin/login') {
      showLogin('Your session ended. Please log in again.');
      throw new Error('Please log in again.');
    }
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }

  /* ---------- photos: shrink on the phone before upload ---------- */
  function shrink(file, max = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error('Please choose a photo (JPG or PNG).'));
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';                       // flatten transparent PNGs
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('This photo format is not supported. Please use a JPG or PNG.'));
      };
      img.src = url;
    });
  }

  /* ============================================================
     LOGIN
     ============================================================ */
  function showLogin(msg) {
    $('app').hidden = true;
    $('login-screen').hidden = false;
    $('login-msg').textContent = msg || '';
    setTimeout(() => $('pw').focus(), 50);
  }
  function showApp() {
    $('login-screen').hidden = true;
    $('app').hidden = false;
    loadEvents();
    loadGallery();
  }

  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    $('login-msg').textContent = '';
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      await api('/api/admin/login', 'POST', { password: $('pw').value });
      $('pw').value = '';
      showApp();
    } catch (err) {
      $('login-msg').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('logout').addEventListener('click', async () => {
    try { await api('/api/admin/logout', 'POST', {}); } catch (e) { /* ignore */ }
    showLogin('You have logged out.');
  });

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
    $('tab-events').hidden = t.dataset.tab !== 'events';
    $('tab-gallery').hidden = t.dataset.tab !== 'gallery';
  }));

  /* ============================================================
     EVENTS
     ============================================================ */
  let events = [];
  let editingId = null;
  let pendingImage = null;     // data URL waiting to upload
  let dropImage = false;

  const today = () => new Date().toISOString().slice(0, 10);

  function niceDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function setStatusPill(pill, value) {
    pill.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === value));
  }
  function getStatusPill(pill) {
    const on = pill.querySelector('button.on');
    return on ? on.dataset.v : 'upcoming';
  }
  $('e-status').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) setStatusPill($('e-status'), b.dataset.v);
  });

  function setPreview(src) {
    const p = $('e-preview');
    if (src) {
      p.outerHTML = `<img class="preview" id="e-preview" src="${esc(src)}" alt="">`;
      $('e-photo-remove').hidden = false;
    } else {
      p.outerHTML = '<div class="preview none" id="e-preview">No photo</div>';
      $('e-photo-remove').hidden = true;
    }
  }

  function openForm(ev) {
    editingId = ev ? ev.id : null;
    pendingImage = null;
    dropImage = false;
    $('form-title').textContent = ev ? 'Edit event' : 'New event';
    $('e-title').value = ev ? ev.title || '' : '';
    $('e-date').value = ev ? ev.date || '' : '';
    $('e-time').value = ev ? ev.time || '' : '';
    $('e-venue').value = ev ? ev.venue || '' : '';
    $('e-location').value = ev ? ev.location || '' : '';
    $('e-desc').value = ev ? ev.description || '' : '';
    $('e-link').value = ev ? ev.link || '' : '';
    $('e-title-mr').value = ev ? ev.title_mr || '' : '';
    $('e-desc-mr').value = ev ? ev.description_mr || '' : '';
    setStatusPill($('e-status'), ev ? ev.status || 'upcoming' : 'upcoming');
    setPreview(ev && ev.image);
    $('e-photo').value = '';
    $('event-form').hidden = false;
    $('new-event').hidden = true;
    $('event-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('e-title').focus(), 300);
  }
  function closeForm() {
    $('event-form').hidden = true;
    $('new-event').hidden = false;
    editingId = null;
  }

  $('new-event').addEventListener('click', () => openForm(null));
  $('cancel-event').addEventListener('click', closeForm);

  $('e-photo').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      busy(true, 'Preparing photo…');
      pendingImage = await shrink(f);
      dropImage = false;
      setPreview(pendingImage);
    } catch (err) {
      toast(err.message, true);
    } finally {
      busy(false);
    }
  });
  $('e-photo-remove').addEventListener('click', () => {
    pendingImage = null;
    dropImage = true;
    setPreview(null);
  });

  $('event-form').addEventListener('submit', async e => {
    e.preventDefault();
    const event = {
      title: $('e-title').value,
      date: $('e-date').value,
      time: $('e-time').value,
      venue: $('e-venue').value,
      location: $('e-location').value,
      description: $('e-desc').value,
      link: $('e-link').value,
      title_mr: $('e-title-mr').value,
      description_mr: $('e-desc-mr').value,
      status: getStatusPill($('e-status')),
    };
    const wasEditing = !!editingId;
    busy(true, pendingImage ? 'Uploading photo and saving…' : 'Saving…');
    try {
      const out = editingId
        ? await api('/api/admin/events', 'PUT', { id: editingId, event, imageData: pendingImage, removeImage: dropImage })
        : await api('/api/admin/events', 'POST', { event, imageData: pendingImage });
      events = out.events;
      renderEvents();
      closeForm();
      toast(wasEditing ? 'Event updated.' : 'Event saved. It is now on the website.');
    } catch (err) {
      toast(err.message, true);
    } finally {
      busy(false);
    }
  });

  async function setStatus(id, status) {
    busy(true, 'Updating…');
    try {
      const out = await api('/api/admin/events', 'PATCH', { id, status });
      events = out.events;
      renderEvents();
      toast(status === 'past' ? 'Moved to Past events.' : 'Moved to Upcoming events.');
    } catch (err) {
      toast(err.message, true);
    } finally {
      busy(false);
    }
  }

  async function removeEvent(id) {
    const ev = events.find(x => x.id === id);
    if (!confirm(`Delete "${ev ? ev.title : 'this event'}"?\n\nThis cannot be undone.`)) return;
    busy(true, 'Deleting…');
    try {
      const out = await api('/api/admin/events?id=' + encodeURIComponent(id), 'DELETE');
      events = out.events;
      renderEvents();
      toast('Event deleted.');
    } catch (err) {
      toast(err.message, true);
    } finally {
      busy(false);
    }
  }

  function eventRow(ev) {
    const img = ev.image
      ? `<img class="thumb" src="${esc(ev.image)}" alt="" loading="lazy">`
      : '<div class="ph">✦</div>';
    const where = [ev.venue, ev.location].filter(Boolean).join(', ');
    const overdue = ev.status !== 'past' && ev.date < today();
    return `
      <article class="ev" data-id="${esc(ev.id)}">
        ${img}
        <div>
          <h3>${esc(ev.title)}</h3>
          <div class="meta">${esc(niceDate(ev.date))}${ev.time ? ' · ' + esc(ev.time) : ''}</div>
          ${where ? `<div class="meta">${esc(where)}</div>` : ''}
        </div>
        <div class="acts">
          <div class="pill small" data-act="status">
            <button type="button" class="up ${ev.status !== 'past' ? 'on' : ''}" data-v="upcoming">Upcoming</button>
            <button type="button" class="past ${ev.status === 'past' ? 'on' : ''}" data-v="past">Past</button>
          </div>
          <div class="row">
            <button type="button" class="btn ghost small" data-act="edit">Edit</button>
            <button type="button" class="btn danger small" data-act="delete">Delete</button>
          </div>
        </div>
        ${overdue ? `<div class="nudge"><span>This date has passed. Move it to Past events?</span>
          <button type="button" class="btn small" data-act="to-past">Move to Past</button></div>` : ''}
      </article>`;
  }

  function renderEvents() {
    const up = events.filter(e => e.status !== 'past').sort((a, b) => a.date.localeCompare(b.date));
    const past = events.filter(e => e.status === 'past').sort((a, b) => b.date.localeCompare(a.date));
    $('n-up').textContent = `(${up.length})`;
    $('n-past').textContent = `(${past.length})`;
    $('list-up').innerHTML = up.length ? up.map(eventRow).join('')
      : '<div class="empty">No upcoming events. Tap “Add a new event” to create one.</div>';
    $('list-past').innerHTML = past.length ? past.map(eventRow).join('')
      : '<div class="empty">Past events will appear here once you move them.</div>';
  }

  document.querySelector('#tab-events').addEventListener('click', e => {
    const card = e.target.closest('.ev');
    if (!card) return;
    const id = card.dataset.id;
    const actBtn = e.target.closest('[data-act]');
    const pillBtn = e.target.closest('[data-act="status"] button');
    if (pillBtn) {
      const ev = events.find(x => x.id === id);
      if (ev && ev.status !== pillBtn.dataset.v) setStatus(id, pillBtn.dataset.v);
      return;
    }
    if (!actBtn) return;
    if (actBtn.dataset.act === 'edit') openForm(events.find(x => x.id === id));
    if (actBtn.dataset.act === 'delete') removeEvent(id);
    if (actBtn.dataset.act === 'to-past') setStatus(id, 'past');
  });

  async function loadEvents() {
    try {
      const out = await api('/api/admin/events');
      events = out.events || [];
      renderEvents();
    } catch (err) {
      toast(err.message, true);
    }
  }

  /* ============================================================
     GALLERY
     ============================================================ */
  let photos = [];
  let maxPhotos = 15;

  function renderGallery() {
    $('g-count').textContent = `${photos.length} / ${maxPhotos}`;
    $('g-add').hidden = photos.length >= maxPhotos;
    if (!photos.length) {
      $('g-grid').innerHTML = '<div class="empty" style="grid-column:1/-1">No photos yet. The gallery stays hidden on the website until you add the first one.</div>';
      return;
    }
    $('g-grid').innerHTML = photos.map((p, i) => `
      <div class="ph-card" data-id="${esc(p.id)}">
        <img src="${esc(p.url)}" alt="" loading="lazy">
        <div class="in">
          <span class="num">Photo ${i + 1}</span>
          <input type="text" maxlength="160" placeholder="Caption (optional)" value="${esc(p.caption || '')}" data-act="caption">
          <div class="row">
            <div class="row" style="gap:.3rem">
              <button type="button" class="btn ghost small" data-act="left" ${i === 0 ? 'disabled' : ''} aria-label="Move earlier">←</button>
              <button type="button" class="btn ghost small" data-act="right" ${i === photos.length - 1 ? 'disabled' : ''} aria-label="Move later">→</button>
            </div>
            <button type="button" class="btn danger small" data-act="delete">Delete</button>
          </div>
        </div>
      </div>`).join('');
  }

  async function loadGallery() {
    try {
      const out = await api('/api/admin/gallery');
      photos = out.photos || [];
      maxPhotos = out.max || 15;
      renderGallery();
    } catch (err) {
      toast(err.message, true);
    }
  }

  $('g-files').addEventListener('change', async e => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    const room = maxPhotos - photos.length;
    if (files.length > room) toast(`Only ${room} more photo${room === 1 ? '' : 's'} can be added. Uploading the first ${room}.`, true);
    const batch = files.slice(0, room);
    let done = 0;
    for (const f of batch) {
      busy(true, `Uploading photo ${done + 1} of ${batch.length}…`);
      try {
        const data = await shrink(f);
        const out = await api('/api/admin/gallery', 'POST', { imageData: data });
        photos = out.photos;
        done++;
      } catch (err) {
        toast(err.message, true);
        break;
      }
    }
    busy(false);
    renderGallery();
    if (done) toast(`${done} photo${done === 1 ? '' : 's'} added.`);
  });

  $('g-grid').addEventListener('click', async e => {
    const card = e.target.closest('.ph-card');
    const btn = e.target.closest('button[data-act]');
    if (!card || !btn) return;
    const id = card.dataset.id;
    const i = photos.findIndex(p => p.id === id);

    if (btn.dataset.act === 'delete') {
      if (!confirm('Remove this photo from the gallery?')) return;
      busy(true, 'Removing…');
      try {
        const out = await api('/api/admin/gallery?id=' + encodeURIComponent(id), 'DELETE');
        photos = out.photos;
        renderGallery();
        toast('Photo removed.');
      } catch (err) { toast(err.message, true); } finally { busy(false); }
      return;
    }

    const j = btn.dataset.act === 'left' ? i - 1 : i + 1;
    if (j < 0 || j >= photos.length) return;
    const order = photos.map(p => p.id);
    [order[i], order[j]] = [order[j], order[i]];
    busy(true, 'Reordering…');
    try {
      const out = await api('/api/admin/gallery', 'PUT', { order });
      photos = out.photos;
      renderGallery();
    } catch (err) { toast(err.message, true); } finally { busy(false); }
  });

  $('g-grid').addEventListener('change', async e => {
    if (e.target.dataset.act !== 'caption') return;
    const id = e.target.closest('.ph-card').dataset.id;
    try {
      const out = await api('/api/admin/gallery', 'PUT', { id, caption: e.target.value });
      photos = out.photos;
      toast('Caption saved.');
    } catch (err) { toast(err.message, true); }
  });

  /* ---------- start ---------- */
  api('/api/admin/session')
    .then(s => (s.loggedIn ? showApp() : showLogin()))
    .catch(() => showLogin());
})();
