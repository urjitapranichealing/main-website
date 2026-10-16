/* ============================================================
   URJITA — website manager
   Talks to /api/admin/*. Plain DOM, no libraries.
   ============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ============================================================
     FEEDBACK
     ============================================================ */
  let toastTimer;
  function toast(msg, bad) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('bad', !!bad);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), bad ? 5500 : 2600);
  }
  function busy(on, msg) {
    $('busy').hidden = !on;
    if (msg) $('busy-msg').textContent = msg;
  }

  /* ============================================================
     SERVER CALLS
     ============================================================ */
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

  /** Upload a prepared photo, reporting progress (0..1). Resolves with its URL. */
  function uploadWithProgress(dataUrl, folder, onProgress) {
    let xhr;
    const promise = new Promise((resolve, reject) => {
      xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/upload');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.min(0.97, e.loaded / e.total)); };
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText || '{}'); } catch (e) { /* ignore */ }
        if (xhr.status === 401) { showLogin('Your session ended. Please log in again.'); reject(new Error('Please log in again.')); return; }
        if (xhr.status < 200 || xhr.status >= 300 || !data.url) { reject(new Error(data.error || 'Upload failed. Please try again.')); return; }
        onProgress(1);
        resolve(data.url);
      };
      xhr.onerror = () => reject(new Error('Upload failed. Check your internet connection.'));
      xhr.onabort = () => reject(new Error('cancelled'));
      xhr.send(JSON.stringify({ imageData: dataUrl, folder }));
    });
    promise.abort = () => xhr && xhr.abort();
    return promise;
  }

  /** Remove an uploaded photo that was never saved. Safe: the server keeps anything in use. */
  function discardUpload(url) {
    if (!url) return;
    api('/api/admin/upload?url=' + encodeURIComponent(url), 'DELETE').catch(() => {});
  }

  /** Shrink a phone photo before upload (keeps uploads fast on mobile data). */
  function shrink(file, max = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('Please choose a photo (JPG or PNG).')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This photo format is not supported. Please use a JPG or PNG.')); };
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
    if (hasUnsaved() && !confirm('Some photos or captions are not saved yet. Log out anyway?')) return;
    try { await api('/api/admin/logout', 'POST', {}); } catch (e) { /* ignore */ }
    showLogin('You have logged out.');
  });

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
    $('tab-events').hidden = t.dataset.tab !== 'events';
    $('tab-gallery').hidden = t.dataset.tab !== 'gallery';
  }));

  /* ============================================================
     DATES, TIMES, REPEATS
     ============================================================ */
  const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const ORD = ['first', 'second', 'third', 'fourth', 'last'];

  const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const parseISO = iso => new Date(iso + 'T00:00:00Z');

  function niceDate(iso, withDay = true) {
    if (!iso) return '';
    return parseISO(iso).toLocaleDateString('en-IN', {
      weekday: withDay ? 'short' : undefined, day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
  }
  function timeLabel(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return `${(h % 12) || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  }
  const ordinal = d => d + ((d % 10 === 1 && d !== 11) ? 'st' : (d % 10 === 2 && d !== 12) ? 'nd' : (d % 10 === 3 && d !== 13) ? 'rd' : 'th');
  const nthOf = iso => Math.min(5, Math.ceil(parseISO(iso).getUTCDate() / 7));

  // quarter-hour lists, so the time can only be picked, never typed
  function fillTimes(sel, placeholder) {
    let html = `<option value="">${placeholder}</option>`;
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 45]) {
        const v = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        html += `<option value="${v}">${timeLabel(v)}</option>`;
      }
    }
    sel.innerHTML = html;
  }
  fillTimes($('e-start'), 'Choose time');
  fillTimes($('e-end'), 'Choose time');

  $('r-interval').innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  $('r-count').innerHTML = Array.from({ length: 59 }, (_, i) => `<option value="${i + 2}">${i + 2}</option>`).join('');
  $('r-count').value = '4';

  // Monday-first chips; values are 0 = Sunday ... 6 = Saturday
  $('r-days').innerHTML = [1, 2, 3, 4, 5, 6, 0]
    .map(d => `<button type="button" class="chip" data-d="${d}">${WD_SHORT[d]}</button>`).join('');

  function selectedDays() {
    return [...$('r-days').querySelectorAll('.chip.on')].map(b => +b.dataset.d);
  }
  function setDays(days) {
    $('r-days').querySelectorAll('.chip').forEach(b => b.classList.toggle('on', days.includes(+b.dataset.d)));
  }
  const radio = name => (document.querySelector(`input[name="${name}"]:checked`) || {}).value;
  const setRadio = (name, v) => { const r = document.querySelector(`input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };

  function readRule() {
    const freq = $('e-repeat').value;
    if (freq === 'none') return { freq: 'none' };
    const rule = { freq, interval: +$('r-interval').value || 1, ends: radio('r-ends') || 'never' };
    if (freq === 'weekly') rule.days = selectedDays();
    if (freq === 'monthly') rule.monthMode = radio('r-mode') || 'date';
    if (rule.ends === 'on') rule.until = $('r-until').value;
    if (rule.ends === 'after') rule.count = +$('r-count').value;
    return rule;
  }

  /** The same wording visitors see, in English. */
  function ruleText(rule, startISO) {
    if (!rule || rule.freq === 'none') return '';
    const n = rule.interval || 1;
    const start = startISO ? parseISO(startISO) : null;
    let out = '';
    if (rule.freq === 'daily') out = n === 1 ? 'Every day' : `Every ${n} days`;
    if (rule.freq === 'weekly') {
      let days = rule.days && rule.days.length ? rule.days : (start ? [start.getUTCDay()] : []);
      days = days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
      if (days.length === 1 && n === 1) out = 'Every ' + WD_LONG[days[0]];
      else {
        const list = days.map(d => WD_SHORT[d]);
        const joined = list.length > 1 ? list.slice(0, -1).join(', ') + ' & ' + list[list.length - 1] : (list[0] || '…');
        out = n === 1 ? `Every ${joined}` : `Every ${n} weeks on ${joined}`;
      }
    }
    if (rule.freq === 'monthly' && start) {
      const every = n === 1 ? 'Every month on the' : `Every ${n} months on the`;
      out = rule.monthMode === 'weekday'
        ? `${every} ${ORD[nthOf(startISO) - 1]} ${WD_LONG[start.getUTCDay()]}`
        : `${every} ${ordinal(start.getUTCDate())}`;
    }
    if (rule.ends === 'on' && rule.until) out += `, until ${niceDate(rule.until, false)}`;
    if (rule.ends === 'after' && rule.count) out += `, ${rule.count} times`;
    return out;
  }

  function refreshRepeatUI() {
    const freq = $('e-repeat').value;
    const repeating = freq !== 'none';
    $('repeat-box').hidden = !repeating;
    $('enddate-wrap').hidden = repeating;          // a repeating event's sessions are single days
    $('r-weekly').hidden = freq !== 'weekly';
    $('r-monthly').hidden = freq !== 'monthly';
    const n = +$('r-interval').value || 1;
    const unit = { daily: 'day', weekly: 'week', monthly: 'month' }[freq];
    $('r-unit').textContent = unit ? unit + (n > 1 ? 's' : '') : '';

    const date = $('e-date').value;
    if (date) {
      const d = parseISO(date);
      $('r-mode-date').textContent = `the ${ordinal(d.getUTCDate())} of the month`;
      $('r-mode-weekday').textContent = `the ${ORD[nthOf(date) - 1]} ${WD_LONG[d.getUTCDay()]} of the month`;
      if (freq === 'weekly' && !selectedDays().length) setDays([d.getUTCDay()]);
    } else {
      $('r-mode-date').textContent = 'the same date each month';
      $('r-mode-weekday').textContent = 'the same weekday each month (e.g. third Saturday)';
    }

    if (repeating) {
      const text = ruleText(readRule(), date);
      const times = $('e-start').value ? ` · ${timeLabel($('e-start').value)}${$('e-end').value ? ' – ' + timeLabel($('e-end').value) : ''}` : '';
      $('r-summary').innerHTML = date
        ? `Visitors will see: <b>${esc(text)}${esc(times)}</b>`
        : 'Choose the first date above to see how it will read.';
    }
  }

  ['e-repeat', 'r-interval', 'r-count', 'r-until', 'e-date', 'e-start', 'e-end'].forEach(id =>
    $(id).addEventListener('change', refreshRepeatUI));
  document.querySelectorAll('input[name="r-mode"], input[name="r-ends"]').forEach(r => r.addEventListener('change', refreshRepeatUI));
  $('r-until').addEventListener('focus', () => setRadio('r-ends', 'on'));
  $('r-count').addEventListener('focus', () => setRadio('r-ends', 'after'));
  $('r-days').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    b.classList.toggle('on');
    if (!selectedDays().length) b.classList.add('on');   // always keep at least one day
    refreshRepeatUI();
  });

  // picking a start time suggests an end time one hour later
  $('e-start').addEventListener('change', () => {
    const s = $('e-start').value, e = $('e-end').value;
    if (s && (!e || e <= s) && !$('e-enddate').value) {
      const [h, m] = s.split(':').map(Number);
      if (h < 23) $('e-end').value = String(h + 1).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }
    if (!s) $('e-end').value = '';
    refreshRepeatUI();
  });

  /* ============================================================
     EVENTS
     ============================================================ */
  let events = [];
  let editing = null;            // the event being edited, or null for a new one
  const photo = { url: null, uploading: null, original: null, removed: false };

  function setStatusPill(pill, value) {
    pill.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === value));
  }
  const getStatusPill = pill => (pill.querySelector('button.on') || {}).dataset.v || 'upcoming';
  $('e-status').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) setStatusPill($('e-status'), b.dataset.v);
  });

  function showPhoto(src, progress, state, cls) {
    $('e-pv').innerHTML = src
      ? `<img src="${esc(src)}" alt="">${progress != null ? `<div class="progress${cls ? ' ' + cls : ''}"><i style="width:${Math.round(progress * 100)}%"></i></div>` : ''}`
      : '<span>No photo</span>';
    $('e-photo-state').textContent = state || '';
    $('e-photo-state').className = 'state' + (cls === 'done' ? ' ok' : cls === 'fail' ? ' bad' : '');
    $('e-photo-remove').hidden = !src;
  }

  function openForm(ev) {
    if (photo.url && photo.url !== photo.original) discardUpload(photo.url);
    editing = ev || null;
    Object.assign(photo, { url: ev ? ev.image || null : null, original: ev ? ev.image || null : null, uploading: null, removed: false });

    $('form-title').textContent = ev ? 'Edit event' : 'New event';
    $('e-title').value = ev ? ev.title || '' : '';
    $('e-date').value = ev ? ev.date || '' : '';
    $('e-start').value = ev && ev.startTime || '';
    $('e-end').value = ev && ev.endTime || '';
    $('e-enddate').value = ev && ev.endDate || '';
    $('e-venue').value = ev ? ev.venue || '' : '';
    $('e-location').value = ev ? ev.location || '' : '';
    $('e-map').value = ev ? ev.mapLink || '' : '';
    $('e-desc').value = ev ? ev.description || '' : '';
    $('e-link').value = ev ? ev.link || '' : '';
    $('e-title-mr').value = ev ? ev.title_mr || '' : '';
    $('e-desc-mr').value = ev ? ev.description_mr || '' : '';
    setStatusPill($('e-status'), ev ? ev.status || 'upcoming' : 'upcoming');

    const old = ev && ev.time && !ev.startTime;
    $('e-oldtime').hidden = !old;
    if (old) $('e-oldtime').textContent = `This event was saved with the time written as “${ev.time}”. Pick the times above to replace it, or leave them empty to keep it.`;

    const r = ev && ev.repeat || { freq: 'none' };
    $('e-repeat').value = r.freq || 'none';
    $('r-interval').value = String(r.interval || 1);
    setDays(r.days || []);
    setRadio('r-mode', r.monthMode || 'date');
    setRadio('r-ends', r.ends || 'never');
    $('r-until').value = r.until || '';
    $('r-count').value = String(r.count || 4);

    showPhoto(photo.url, null, photo.url ? 'Current photo' : '');
    $('e-photo').value = '';
    $('event-form').hidden = false;
    $('new-event').hidden = true;
    refreshRepeatUI();
    $('event-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('e-title').focus(), 300);
  }

  function closeForm(saved) {
    if (!saved && photo.url && photo.url !== photo.original) discardUpload(photo.url);
    if (photo.uploading) photo.uploading.abort();
    Object.assign(photo, { url: null, uploading: null, original: null, removed: false });
    $('event-form').hidden = true;
    $('new-event').hidden = false;
    editing = null;
  }

  $('new-event').addEventListener('click', () => openForm(null));
  $('cancel-event').addEventListener('click', () => closeForm(false));

  $('e-photo').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (photo.uploading) photo.uploading.abort();
    if (photo.url && photo.url !== photo.original) discardUpload(photo.url);
    photo.url = null;
    let data;
    try { data = await shrink(f); } catch (err) { toast(err.message, true); return; }
    showPhoto(data, 0, 'Uploading… 0%');
    $('save-event').disabled = true;
    const up = uploadWithProgress(data, 'events', p => showPhoto(data, p, p < 1 ? `Uploading… ${Math.round(p * 100)}%` : 'Finishing…'));
    photo.uploading = up;
    try {
      photo.url = await up;
      photo.removed = false;
      showPhoto(data, 1, 'Uploaded — press Save event to keep it.', 'done');
    } catch (err) {
      if (err.message !== 'cancelled') { showPhoto(data, 1, err.message, 'fail'); toast(err.message, true); }
    } finally {
      photo.uploading = null;
      $('save-event').disabled = false;
    }
  });

  $('e-photo-remove').addEventListener('click', () => {
    if (photo.uploading) photo.uploading.abort();
    if (photo.url && photo.url !== photo.original) discardUpload(photo.url);
    photo.url = null;
    photo.removed = true;
    showPhoto(null);
  });

  $('event-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (photo.uploading) { toast('Please wait for the photo to finish uploading.', true); return; }
    const repeating = $('e-repeat').value !== 'none';
    const event = {
      title: $('e-title').value,
      date: $('e-date').value,
      endDate: repeating ? '' : $('e-enddate').value,
      startTime: $('e-start').value,
      endTime: $('e-end').value,
      venue: $('e-venue').value,
      location: $('e-location').value,
      mapLink: $('e-map').value.trim(),
      description: $('e-desc').value,
      link: $('e-link').value.trim(),
      title_mr: $('e-title-mr').value,
      description_mr: $('e-desc-mr').value,
      status: getStatusPill($('e-status')),
      repeat: readRule(),
      keepOldTime: !!(editing && editing.time),
    };
    // friendly checks before the server's
    if (!event.title.trim()) { toast('Please give the event a name.', true); $('e-title').focus(); return; }
    if (!event.date) { toast('Please choose the date.', true); $('e-date').focus(); return; }
    if (event.endTime && !event.startTime) { toast('Please choose a start time too.', true); return; }
    if (!event.endDate && event.startTime && event.endTime && event.endTime <= event.startTime) {
      toast('The end time must be later than the start time.', true); return;
    }
    if (event.endDate && event.endDate < event.date) { toast('The end date cannot be before the start date.', true); return; }
    if (repeating && event.repeat.ends === 'on' && !event.repeat.until) { toast('Please choose when the repeating event ends.', true); return; }
    if (event.mapLink && !/^https:\/\//i.test(event.mapLink)) { toast('The Google Maps link should start with https://', true); return; }

    const body = { event, imageUrl: photo.url && photo.url !== photo.original ? photo.url : undefined };
    if (editing) { body.id = editing.id; body.removeImage = photo.removed && !photo.url; }
    const wasEditing = !!editing;
    busy(true, 'Saving…');
    try {
      const out = await api('/api/admin/events', wasEditing ? 'PUT' : 'POST', body);
      events = out.events;
      renderEvents();
      closeForm(true);
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
    } catch (err) { toast(err.message, true); } finally { busy(false); }
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
    } catch (err) { toast(err.message, true); } finally { busy(false); }
  }

  function whenText(ev) {
    let d;
    if (ev.repeat) d = ev.next ? 'Next: ' + niceDate(ev.next) : 'Last: ' + niceDate(ev.last || ev.date);
    else if (ev.endDate) d = niceDate(ev.date) + ' – ' + niceDate(ev.endDate);
    else d = niceDate(ev.date);
    const t = ev.startTime ? timeLabel(ev.startTime) + (ev.endTime ? ' – ' + timeLabel(ev.endTime) : '') : (ev.time || '');
    return d + (t ? ' · ' + t : '');
  }

  function eventRow(ev) {
    const img = ev.image ? `<img class="thumb" src="${esc(ev.image)}" alt="" loading="lazy">` : '<div class="ph">✦</div>';
    const where = [ev.venue, ev.location].filter(Boolean).join(', ');
    const rep = ruleText(ev.repeat, ev.date);
    const over = ev.status !== 'past' && ev.ended;
    return `
      <article class="ev" data-id="${esc(ev.id)}">
        ${img}
        <div>
          <h3>${esc(ev.title)}</h3>
          <div class="meta">${esc(whenText(ev))}</div>
          ${rep ? `<div class="meta rep">↻ ${esc(rep)}</div>` : ''}
          ${where ? `<div class="meta">${esc(where)}${ev.mapLink ? ' · map link added' : ''}</div>` : ''}
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
        ${over ? `<div class="nudge"><span>${ev.repeat ? 'This repeating event has finished.' : 'This date has passed.'} Move it to Past events?</span>
          <button type="button" class="btn small" data-act="to-past">Move to Past</button></div>` : ''}
      </article>`;
  }

  function renderEvents() {
    const up = events.filter(e => e.status !== 'past');
    const past = events.filter(e => e.status === 'past').reverse();
    $('n-up').textContent = `(${up.length})`;
    $('n-past').textContent = `(${past.length})`;
    $('list-up').innerHTML = up.length ? up.map(eventRow).join('')
      : '<div class="empty">No upcoming events. Tap “Add a new event” to create one.</div>';
    $('list-past').innerHTML = past.length ? past.map(eventRow).join('')
      : '<div class="empty">Past events will appear here once you move them.</div>';
  }

  $('tab-events').addEventListener('click', e => {
    const card = e.target.closest('.ev');
    if (!card) return;
    const id = card.dataset.id;
    const pillBtn = e.target.closest('[data-act="status"] button');
    if (pillBtn) {
      const ev = events.find(x => x.id === id);
      if (ev && ev.status !== pillBtn.dataset.v) setStatus(id, pillBtn.dataset.v);
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'edit') openForm(events.find(x => x.id === id));
    if (act.dataset.act === 'delete') removeEvent(id);
    if (act.dataset.act === 'to-past') setStatus(id, 'past');
  });

  async function loadEvents() {
    try {
      const out = await api('/api/admin/events');
      events = out.events || [];
      renderEvents();
    } catch (err) { toast(err.message, true); }
  }

  /* ============================================================
     GALLERY
     Step 1: choose photos -> each uploads with its own progress bar
     Step 2: add a caption -> press Save (or Save all)
     ============================================================ */
  let photos = [];
  let maxPhotos = 15;
  const drafts = [];             // { key, preview, url, state, progress, job }
  const editedCaptions = {};     // saved photo id -> caption typed but not saved yet
  let seq = 0;

  const room = () => maxPhotos - photos.length - drafts.length;

  function updateCount() {
    $('g-count').textContent = `${photos.length} / ${maxPhotos}`;
    $('g-add').hidden = room() <= 0;
    $('drafts-wrap').hidden = !drafts.length;
    $('save-all').hidden = drafts.filter(d => d.state === 'ready').length < 2;
  }

  /* ---- drafts ---- */
  function draftCard(d) {
    return `
      <div class="ph-card draft" data-key="${d.key}">
        <div class="img"><img src="${esc(d.preview || '')}" alt=""><span class="badge">New</span></div>
        <div class="in">
          <div class="progress"><i style="width:0%"></i></div>
          <span class="state">Waiting…</span>
          <input type="text" maxlength="160" placeholder="Caption (optional)" data-role="caption">
          <div class="row">
            <button type="button" class="btn ok small" data-act="save" disabled>Save</button>
            <button type="button" class="btn ghost small" data-act="retry" hidden>Try again</button>
            <button type="button" class="btn danger small" data-act="remove">Remove</button>
          </div>
        </div>
      </div>`;
  }

  function paintDraft(d) {
    const el = $('d-grid').querySelector(`[data-key="${d.key}"]`);
    if (!el) return;
    if (d.preview) el.querySelector('.img img').src = d.preview;
    const bar = el.querySelector('.progress');
    bar.className = 'progress' + (d.state === 'ready' ? ' done' : d.state === 'failed' ? ' fail' : '');
    bar.querySelector('i').style.width = Math.round((d.state === 'ready' || d.state === 'failed' ? 1 : d.progress) * 100) + '%';
    const st = el.querySelector('.state');
    st.className = 'state' + (d.state === 'ready' ? ' ok' : d.state === 'failed' ? ' bad' : '');
    st.textContent = {
      waiting: 'Waiting to upload…',
      preparing: 'Preparing photo…',
      uploading: d.progress < 0.97 ? `Uploading… ${Math.round(d.progress * 100)}%` : 'Finishing upload…',
      ready: 'Uploaded ✓ Add a caption and press Save.',
      saving: 'Saving…',
      failed: d.error || 'Upload failed.',
    }[d.state];
    el.querySelector('[data-act="save"]').disabled = d.state !== 'ready';
    el.querySelector('[data-act="retry"]').hidden = d.state !== 'failed';
    el.querySelector('[data-act="remove"]').disabled = d.state === 'saving';
    updateCount();
  }

  let active = 0;
  const queue = [];
  function pump() {
    while (active < 2 && queue.length) {
      const d = queue.shift();
      if (!drafts.includes(d)) continue;
      active++;
      runUpload(d).finally(() => { active--; pump(); });
    }
  }

  async function runUpload(d) {
    try {
      if (!d.data) {
        d.state = 'preparing'; paintDraft(d);
        d.data = await shrink(d.file);
        d.preview = d.data;
      }
      d.state = 'uploading'; d.progress = 0; paintDraft(d);
      d.job = uploadWithProgress(d.data, 'gallery', p => { d.progress = p; paintDraft(d); });
      d.url = await d.job;
      d.state = 'ready';
    } catch (err) {
      if (err.message === 'cancelled') return;
      d.state = 'failed';
      d.error = err.message;
    } finally {
      d.job = null;
      paintDraft(d);
    }
  }

  $('g-files').addEventListener('change', e => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    const space = room();
    if (files.length > space) {
      toast(space > 0 ? `Only ${space} more photo${space === 1 ? '' : 's'} can be added. Taking the first ${space}.` : 'The gallery is full (15 photos).', true);
    }
    files.slice(0, Math.max(0, space)).forEach(file => {
      const d = { key: 'd' + (++seq), file, preview: URL.createObjectURL(file), url: null, state: 'waiting', progress: 0 };
      drafts.push(d);
      $('d-grid').insertAdjacentHTML('beforeend', draftCard(d));
      paintDraft(d);
      queue.push(d);
    });
    updateCount();
    pump();
  });

  async function saveDraft(d, quiet) {
    const el = $('d-grid').querySelector(`[data-key="${d.key}"]`);
    const caption = el ? el.querySelector('[data-role="caption"]').value : '';
    d.state = 'saving'; paintDraft(d);
    try {
      const out = await api('/api/admin/gallery', 'POST', { url: d.url, caption });
      photos = out.photos;
      maxPhotos = out.max || maxPhotos;
      drafts.splice(drafts.indexOf(d), 1);
      if (el) el.remove();
      renderGallery();
      if (!quiet) toast('Photo saved to the gallery.');
      return true;
    } catch (err) {
      d.state = 'ready'; paintDraft(d);
      toast(err.message, true);
      return false;
    }
  }

  function removeDraft(d) {
    if (d.job) d.job.abort();
    const qi = queue.indexOf(d);
    if (qi >= 0) queue.splice(qi, 1);
    if (d.url) discardUpload(d.url);
    drafts.splice(drafts.indexOf(d), 1);
    const el = $('d-grid').querySelector(`[data-key="${d.key}"]`);
    if (el) el.remove();
    updateCount();
  }

  $('d-grid').addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const d = drafts.find(x => x.key === btn.closest('.ph-card').dataset.key);
    if (!d) return;
    if (btn.dataset.act === 'save') saveDraft(d);
    if (btn.dataset.act === 'remove') removeDraft(d);
    if (btn.dataset.act === 'retry') { d.state = 'waiting'; d.error = ''; paintDraft(d); queue.push(d); pump(); }
  });

  $('save-all').addEventListener('click', async () => {
    const ready = drafts.filter(d => d.state === 'ready');
    let n = 0;
    for (const d of ready) if (await saveDraft(d, true)) n++;
    if (n) toast(`${n} photo${n === 1 ? '' : 's'} saved to the gallery.`);
  });

  /* ---- saved photos ---- */
  function renderGallery() {
    updateCount();
    if (!photos.length) {
      $('g-grid').innerHTML = '<div class="empty" style="grid-column:1/-1">No photos in the gallery yet. The gallery stays hidden on the website until you save the first one.</div>';
      return;
    }
    $('g-grid').innerHTML = photos.map((p, i) => {
      const typed = editedCaptions[p.id];
      const value = typed != null ? typed : (p.caption || '');
      return `
      <div class="ph-card" data-id="${esc(p.id)}">
        <div class="img"><img src="${esc(p.url)}" alt="" loading="lazy"></div>
        <div class="in">
          <span class="num">Photo ${i + 1} of ${photos.length}</span>
          <input type="text" maxlength="160" placeholder="Caption (optional)" value="${esc(value)}" data-role="caption">
          <div class="row">
            <button type="button" class="btn ok small" data-act="save-caption" ${typed != null && typed !== (p.caption || '') ? '' : 'disabled'}>Save caption</button>
            <span class="state" data-role="saved"></span>
          </div>
          <div class="row">
            <div class="row" style="gap:.3rem">
              <button type="button" class="btn ghost small" data-act="left" ${i === 0 ? 'disabled' : ''} aria-label="Move earlier">←</button>
              <button type="button" class="btn ghost small" data-act="right" ${i === photos.length - 1 ? 'disabled' : ''} aria-label="Move later">→</button>
            </div>
            <button type="button" class="btn danger small" data-act="delete">Delete</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  async function loadGallery() {
    try {
      const out = await api('/api/admin/gallery');
      photos = out.photos || [];
      maxPhotos = out.max || 15;
      renderGallery();
    } catch (err) { toast(err.message, true); }
  }

  // typing a caption enables its Save button
  $('g-grid').addEventListener('input', e => {
    if (e.target.dataset.role !== 'caption') return;
    const card = e.target.closest('.ph-card');
    const p = photos.find(x => x.id === card.dataset.id);
    const changed = e.target.value !== (p.caption || '');
    if (changed) editedCaptions[p.id] = e.target.value; else delete editedCaptions[p.id];
    card.querySelector('[data-act="save-caption"]').disabled = !changed;
    card.querySelector('[data-role="saved"]').textContent = changed ? 'Not saved yet' : '';
  });

  $('g-grid').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const card = btn.closest('.ph-card');
    const id = card.dataset.id;
    const i = photos.findIndex(p => p.id === id);

    if (btn.dataset.act === 'save-caption') {
      btn.disabled = true;
      try {
        const out = await api('/api/admin/gallery', 'PUT', { id, caption: card.querySelector('[data-role="caption"]').value });
        photos = out.photos;
        delete editedCaptions[id];
        card.querySelector('[data-role="saved"]').textContent = 'Saved ✓';
        card.querySelector('[data-role="saved"]').className = 'state ok';
      } catch (err) { btn.disabled = false; toast(err.message, true); }
      return;
    }

    if (btn.dataset.act === 'delete') {
      if (!confirm('Remove this photo from the gallery?')) return;
      busy(true, 'Removing…');
      try {
        const out = await api('/api/admin/gallery?id=' + encodeURIComponent(id), 'DELETE');
        photos = out.photos;
        delete editedCaptions[id];
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

  /* ---- don't lose work by accident ---- */
  function hasUnsaved() {
    return drafts.length > 0 || Object.keys(editedCaptions).length > 0;
  }
  window.addEventListener('beforeunload', e => {
    if (!hasUnsaved()) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* ---------- start ---------- */
  api('/api/admin/session')
    .then(s => (s.loggedIn ? showApp() : showLogin()))
    .catch(() => showLogin());
})();
