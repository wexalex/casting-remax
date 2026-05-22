/* ================================================================
   WEXPLORE · CASTING AUSWAHL · APP LOGIC
   ================================================================ */

const STORAGE_KEY = 'wexplore-casting-remax-v1';

/* ---------- STATE ---------- */
const state = {
  models: [],
  votes: {},           // { id: 'yes' | 'maybe' | 'no' | undefined }
  notes: {},           // { id: 'text' }
  filter: 'available', // 'all' | 'available' | 'open' | 'yes' | 'maybe' | 'no'
  categoryFilter: 'all',
  search: '',
  imageIdx: {},        // { id: current image index for carousel }
};

/* ---------- DOM ---------- */
const $grid = document.getElementById('grid');
const $emptyState = document.getElementById('emptyState');
const $search = document.getElementById('search');
const $filters = document.getElementById('filters');
const $categoryFilters = document.getElementById('categoryFilters');
const $modal = document.getElementById('modal');
const $modalInner = document.getElementById('modalInner');
const $toast = document.getElementById('toast');
const $copyBtn = document.getElementById('copyResults');

/* ---------- STORAGE ---------- */
function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.votes = data.votes || {};
    state.notes = data.notes || {};
  } catch (e) {
    console.warn('Could not load saved state', e);
  }
}
function saveStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      votes: state.votes,
      notes: state.notes,
    }));
  } catch (e) {
    console.warn('Could not save state', e);
  }
}

/* ---------- DATA LOAD ---------- */
async function loadModels() {
  try {
    const res = await fetch('models.json');
    if (!res.ok) throw new Error('models.json HTTP ' + res.status);
    state.models = await res.json();
  } catch (e) {
    console.warn('Could not load models.json, using fallback', e);
    state.models = FALLBACK_MODELS;
  }
  // ensure unique ids
  const seen = new Set();
  state.models.forEach((m, i) => {
    let id = m.id || (m.name || 'model').toLowerCase().replace(/\s+/g, '-');
    while (seen.has(id)) id = id + '-' + i;
    seen.add(id);
    m.id = id;
  });
}

/* ---------- RENDER: CATEGORY FILTERS ---------- */
function renderCategoryFilters() {
  const cats = Array.from(new Set(state.models.map(m => m.category)));
  const html = `
    <button class="filter ${state.categoryFilter === 'all' ? 'is-active' : ''}" data-cat="all">Alle Kategorien</button>
    ${cats.map(c => `
      <button class="filter ${state.categoryFilter === c ? 'is-active' : ''}" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>
    `).join('')}
  `;
  $categoryFilters.innerHTML = html;
}

/* ---------- RENDER: CARDS ---------- */
function renderGrid() {
  const filtered = state.models.filter(m => {
    // status filter
    const vote = state.votes[m.id];
    if (state.filter === 'available' && !isAvailable(m.availability)) return false;
    if (state.filter === 'open' && vote) return false;
    if (state.filter === 'yes' && vote !== 'yes') return false;
    if (state.filter === 'maybe' && vote !== 'maybe') return false;
    if (state.filter === 'no' && vote !== 'no') return false;

    // category filter
    if (state.categoryFilter !== 'all' && m.category !== state.categoryFilter) return false;

    // search
    if (state.search) {
      const hay = (
        (m.name || '') + ' ' +
        (m.location || '') + ' ' +
        (m.availability || '') + ' ' +
        (m.travel || '') + ' ' +
        (m.category || '') + ' ' +
        (m.status || '')
      ).toLowerCase();
      if (!hay.includes(state.search.toLowerCase())) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    $grid.innerHTML = '';
    $emptyState.hidden = false;
  } else {
    $emptyState.hidden = true;
    $grid.innerHTML = filtered.map(renderCard).join('');
  }

  renderCounts();
}

function renderCard(m) {
  const vote = state.votes[m.id];
  const voteClass = vote ? `vote-${vote}` : '';
  const statusClass = (m.status || '').toLowerCase().includes('favorit') ? 'is-favorit' : 'is-backup';

  const availClass = getAvailClass(m.availability);
  const travelClass = isTravelWarning(m.travel) ? 'is-warning' : '';

  const initials = getInitials(m.name);
  const imgs = getImages(m);
  const idx = clampIdx(state.imageIdx[m.id] || 0, imgs.length);
  const currentImg = imgs[idx];
  const imageHtml = currentImg
    ? `<img class="card-img-current" src="${escapeAttr(currentImg)}" alt="${escapeAttr(m.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
       <div class="card-image-placeholder" style="display:none;">${escapeHtml(initials)}</div>`
    : `<div class="card-image-placeholder">${escapeHtml(initials)}</div>`;

  const carouselHtml = imgs.length > 1 ? `
    <button class="card-img-nav card-img-prev" data-img-nav="prev" aria-label="Voriges Bild" type="button">‹</button>
    <button class="card-img-nav card-img-next" data-img-nav="next" aria-label="Nächstes Bild" type="button">›</button>
    <div class="card-img-counter">${idx + 1}/${imgs.length}</div>
  ` : '';

  return `
    <article class="card ${voteClass}" data-id="${escapeAttr(m.id)}">
      <div class="card-image" data-action="open">
        ${imageHtml}
        ${carouselHtml}
        ${getAgencyTagHtml(m.agencyVote)}
      </div>
      <div class="card-body">
        ${m.category ? `<div class="card-category">${escapeHtml(m.category)}</div>` : ''}
        <h2 class="card-name">${escapeHtml(m.name || 'Unbenannt')}</h2>
        ${m.location ? `<p class="card-meta">${escapeHtml(m.location)}</p>` : ''}

        <div class="card-info">
          <div class="info-row">
            <span class="info-label">Verf.</span>
            <span class="info-value ${availClass}">${escapeHtml(m.availability || '-')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Anreise</span>
            <span class="info-value ${travelClass}">${escapeHtml(m.travel || '-')}</span>
          </div>
        </div>

        <div class="card-links">
          ${m.setcardUrl ? `<a class="card-link" href="${escapeAttr(m.setcardUrl)}" target="_blank" rel="noopener">Setcard</a>` : ''}
          ${m.agencyUrl && m.agencyUrl !== m.setcardUrl ? `<a class="card-link" href="${escapeAttr(m.agencyUrl)}" target="_blank" rel="noopener">Agentur</a>` : ''}
        </div>

        <div class="vote-bar" data-id="${escapeAttr(m.id)}">
          <button class="vote-btn vote-yes-btn ${vote === 'yes' ? 'is-active' : ''}" data-vote="yes">Ja</button>
          <button class="vote-btn vote-maybe-btn ${vote === 'maybe' ? 'is-active' : ''}" data-vote="maybe">Vielleicht</button>
          <button class="vote-btn vote-no-btn ${vote === 'no' ? 'is-active' : ''}" data-vote="no">Nein</button>
        </div>
      </div>
    </article>
  `;
}

/* ---------- COUNTS ---------- */
function renderCounts() {
  const counts = { total: state.models.length, yes: 0, maybe: 0, no: 0, open: 0 };
  state.models.forEach(m => {
    const v = state.votes[m.id];
    if (v === 'yes') counts.yes++;
    else if (v === 'maybe') counts.maybe++;
    else if (v === 'no') counts.no++;
    else counts.open++;
  });
  document.querySelectorAll('[data-count]').forEach(el => {
    const key = el.getAttribute('data-count');
    el.textContent = counts[key];
  });
}

/* ---------- INTERACTIONS ---------- */
$grid.addEventListener('click', (e) => {
  // image carousel nav?
  const navBtn = e.target.closest('[data-img-nav]');
  if (navBtn) {
    e.stopPropagation();
    const card = navBtn.closest('.card');
    const id = card.getAttribute('data-id');
    const m = state.models.find(x => x.id === id);
    if (!m) return;
    const imgs = getImages(m);
    if (imgs.length <= 1) return;
    const dir = navBtn.getAttribute('data-img-nav') === 'next' ? 1 : -1;
    const cur = clampIdx(state.imageIdx[id] || 0, imgs.length);
    const next = (cur + dir + imgs.length) % imgs.length;
    state.imageIdx[id] = next;
    // Only update img + counter, not whole card
    const img = card.querySelector('.card-img-current');
    if (img) img.src = imgs[next];
    const counter = card.querySelector('.card-img-counter');
    if (counter) counter.textContent = `${next + 1}/${imgs.length}`;
    return;
  }

  // vote button?
  const voteBtn = e.target.closest('.vote-btn');
  if (voteBtn) {
    const bar = voteBtn.closest('.vote-bar');
    const id = bar.getAttribute('data-id');
    const vote = voteBtn.getAttribute('data-vote');
    // toggle off if same
    if (state.votes[id] === vote) {
      delete state.votes[id];
    } else {
      state.votes[id] = vote;
    }
    saveStorage();
    renderGrid();
    return;
  }
  // open modal?
  const openBtn = e.target.closest('[data-action="open"]');
  if (openBtn) {
    const card = e.target.closest('.card');
    if (card) openModal(card.getAttribute('data-id'));
  }
});

$search.addEventListener('input', (e) => {
  state.search = e.target.value;
  renderGrid();
});

$filters.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter');
  if (!btn) return;
  state.filter = btn.getAttribute('data-filter');
  $filters.querySelectorAll('.filter').forEach(b => b.classList.toggle('is-active', b === btn));
  renderGrid();
});

$categoryFilters.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter');
  if (!btn) return;
  state.categoryFilter = btn.getAttribute('data-cat');
  renderCategoryFilters();
  renderGrid();
});

/* ---------- MODAL ---------- */
function openModal(id) {
  const m = state.models.find(x => x.id === id);
  if (!m) return;

  const availClass = getAvailClass(m.availability);
  const travelClass = isTravelWarning(m.travel) ? 'is-warning' : '';
  const initials = getInitials(m.name);
  const imgs = getImages(m);
  const idx = clampIdx(state.imageIdx[id] || 0, imgs.length);
  const currentImg = imgs[idx];
  const imageHtml = currentImg
    ? `<img class="modal-img-current" src="${escapeAttr(currentImg)}" alt="${escapeAttr(m.name)}" />`
    : `<div class="card-image-placeholder">${escapeHtml(initials)}</div>`;
  const heroNav = imgs.length > 1 ? `
    <button class="modal-img-nav modal-img-prev" data-modal-nav="prev" aria-label="Voriges Bild" type="button">‹</button>
    <button class="modal-img-nav modal-img-next" data-modal-nav="next" aria-label="Nächstes Bild" type="button">›</button>
    <div class="modal-img-counter">${idx + 1}/${imgs.length}</div>
  ` : '';

  const note = state.notes[id] || '';

  $modalInner.setAttribute('data-modal-id', id);
  $modalInner.innerHTML = `
    <div class="modal-hero" data-modal-id="${escapeAttr(id)}">${imageHtml}${heroNav}</div>
    <div class="modal-body">
      ${m.category ? `<div class="modal-cat">${escapeHtml(m.category)} · ${escapeHtml(m.status || '')}${m.agencyVote ? ' · ' + agencyVoteLabel(m.agencyVote) : ''}</div>` : ''}
      <h2 class="modal-name" id="modalName">${escapeHtml(m.name || '')}</h2>
      ${m.location ? `<p class="modal-location">${escapeHtml(m.location)}</p>` : ''}

      <div class="modal-detail">
        <div class="modal-detail-label">Verfügbarkeit</div>
        <div class="modal-detail-value ${availClass}">${escapeHtml(m.availability || '-')}</div>
      </div>
      <div class="modal-detail">
        <div class="modal-detail-label">Anreise</div>
        <div class="modal-detail-value ${travelClass}">${escapeHtml(m.travel || '-')}</div>
      </div>

      ${m.notes ? `<div class="modal-notes">${escapeHtml(m.notes)}</div>` : ''}

      <div class="modal-actions">
        ${m.setcardUrl ? `<a class="modal-action" href="${escapeAttr(m.setcardUrl)}" target="_blank" rel="noopener">Setcard öffnen</a>` : ''}
        ${m.agencyUrl && m.agencyUrl !== m.setcardUrl ? `<a class="modal-action" href="${escapeAttr(m.agencyUrl)}" target="_blank" rel="noopener">Agenturseite</a>` : ''}
      </div>

      <label class="modal-notes-label" for="modalNotes">Eigene Notiz (bleibt nur bei euch)</label>
      <textarea class="modal-notes-area" id="modalNotes" placeholder="z.B. Lieblings-Look, Bedenken, Rücksprache nötig …">${escapeHtml(note)}</textarea>
    </div>
  `;
  $modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // notes binding
  const $notes = document.getElementById('modalNotes');
  $notes.addEventListener('input', () => {
    state.notes[id] = $notes.value;
    saveStorage();
  });
}

function closeModal() {
  $modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

$modal.addEventListener('click', (e) => {
  // modal image nav?
  const navBtn = e.target.closest('[data-modal-nav]');
  if (navBtn) {
    e.stopPropagation();
    cycleModalImage(navBtn.getAttribute('data-modal-nav') === 'next' ? 1 : -1);
    return;
  }
  if (e.target.hasAttribute('data-close')) closeModal();
});
document.addEventListener('keydown', (e) => {
  const modalOpen = $modal.getAttribute('aria-hidden') === 'false';
  if (!modalOpen) return;
  if (e.key === 'Escape') { closeModal(); return; }
  if (e.key === 'ArrowRight') { cycleModalImage(1); return; }
  if (e.key === 'ArrowLeft')  { cycleModalImage(-1); return; }
});

function cycleModalImage(dir) {
  const $hero = $modalInner.querySelector('.modal-hero');
  if (!$hero) return;
  const id = $modalInner.getAttribute('data-modal-id');
  if (!id) return;
  const m = state.models.find(x => x.id === id);
  if (!m) return;
  const imgs = getImages(m);
  if (imgs.length <= 1) return;
  const cur = clampIdx(state.imageIdx[id] || 0, imgs.length);
  const next = (cur + dir + imgs.length) % imgs.length;
  state.imageIdx[id] = next;
  const $img = $hero.querySelector('.modal-img-current');
  if ($img) $img.src = imgs[next];
  const $counter = $hero.querySelector('.modal-img-counter');
  if ($counter) $counter.textContent = `${next + 1}/${imgs.length}`;
  // Auch Card im Grid syncen, falls sichtbar
  const $cardImg = $grid.querySelector(`.card[data-id="${CSS.escape(id)}"] .card-img-current`);
  if ($cardImg) $cardImg.src = imgs[next];
  const $cardCounter = $grid.querySelector(`.card[data-id="${CSS.escape(id)}"] .card-img-counter`);
  if ($cardCounter) $cardCounter.textContent = `${next + 1}/${imgs.length}`;
}

/* ---------- SEND RESULTS ---------- */
const WEB3FORMS_KEY = '1dce030d-d365-4be5-a295-c82daee54fb4';

const $sendModal = document.getElementById('sendModal');
const $sendForm = document.getElementById('sendForm');
const $sendName = document.getElementById('sendName');
const $sendComment = document.getElementById('sendComment');
const $sendSubmit = document.getElementById('sendSubmit');
const $sendSummary = document.getElementById('sendSummary');

$copyBtn.addEventListener('click', () => {
  // Falls niemand markiert: gar nicht erst Modal öffnen
  const yesCount = state.models.filter(m => state.votes[m.id] === 'yes').length;
  const maybeCount = state.models.filter(m => state.votes[m.id] === 'maybe').length;
  if (yesCount + maybeCount === 0) {
    showToast('Keine Auswahl getroffen');
    return;
  }

  // Summary text im Modal aktualisieren
  const parts = [];
  if (yesCount > 0) parts.push(`${yesCount}× Ja`);
  if (maybeCount > 0) parts.push(`${maybeCount}× Vielleicht`);
  $sendSummary.textContent = `${parts.join(' und ')} - wird an Wexplore Productions gesendet.`;

  openSendModal();
});

function openSendModal() {
  $sendModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  // Vorherigen Namen aus localStorage holen, falls vorhanden
  const savedName = localStorage.getItem('wexplore-casting-sender-name');
  if (savedName) $sendName.value = savedName;
  setTimeout(() => $sendName.focus(), 100);
}

function closeSendModal() {
  $sendModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

$sendModal.addEventListener('click', (e) => {
  if (e.target.hasAttribute('data-close-send')) closeSendModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $sendModal.getAttribute('aria-hidden') === 'false') closeSendModal();
});

$sendForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $sendName.value.trim();
  const comment = $sendComment.value.trim();

  if (!name) {
    $sendName.focus();
    return;
  }

  // Name in localStorage für nächstes Mal
  localStorage.setItem('wexplore-casting-sender-name', name);

  const text = buildResultText(name, comment).join('\n');

  setSendBtnState('sending');

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `Casting-Auswahl RE/MAX FSBO - von ${name}`,
        from_name: name,
        message: text,
        botcheck: ''
      })
    });
    const data = await res.json();
    if (data.success) {
      setSendBtnState('sent');
      setTimeout(() => {
        closeSendModal();
        setSendBtnState('idle');
        $sendComment.value = '';
        showToast('An Wexplore gesendet ✓');
        // Floating-Button kurz auf "Gesendet"
        markFloatingSent();
      }, 800);
    } else {
      throw new Error(data.message || 'Sendung fehlgeschlagen');
    }
  } catch (err) {
    console.warn('Send failed, falling back to copy', err);
    setSendBtnState('idle');
    try {
      await navigator.clipboard.writeText(text);
      showToast('Senden fehlgeschlagen - in Zwischenablage kopiert');
    } catch (e) {
      const w = window.open('', '_blank');
      if (w) {
        w.document.body.innerHTML = `<pre style="font-family:sans-serif;padding:20px;white-space:pre-wrap;">${escapeHtml(text)}</pre>`;
      }
      showToast('Bitte Text manuell kopieren');
    }
  }
});

function setSendBtnState(mode) {
  const $label = $sendSubmit.querySelector('.send-btn-label');
  const $icon  = $sendSubmit.querySelector('.send-btn-icon');
  $sendSubmit.classList.remove('is-sending', 'is-sent');
  if (mode === 'sending') {
    $sendSubmit.classList.add('is-sending');
    $sendSubmit.disabled = true;
    $label.textContent = 'Wird gesendet …';
    $icon.textContent = '';
  } else if (mode === 'sent') {
    $sendSubmit.classList.add('is-sent');
    $sendSubmit.disabled = true;
    $label.textContent = 'Gesendet';
    $icon.textContent = '✓';
  } else {
    $sendSubmit.disabled = false;
    $label.textContent = 'Absenden';
    $icon.textContent = '→';
  }
}

function markFloatingSent() {
  const $label = $copyBtn.querySelector('.floating-btn-label');
  const $icon  = $copyBtn.querySelector('.floating-btn-icon');
  $copyBtn.classList.add('is-sent');
  $copyBtn.disabled = true;
  $label.textContent = 'Gesendet';
  $icon.textContent = '✓';
  setTimeout(() => {
    $copyBtn.classList.remove('is-sent');
    $copyBtn.disabled = false;
    $label.textContent = 'Auswahl an Wexplore senden';
    $icon.textContent = '→';
  }, 3000);
}

function buildResultText(senderName, senderComment) {
  const lines = [];
  lines.push('CASTING AUSWAHL - RE/MAX FSBO');
  lines.push('Stand: ' + new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  if (senderName) lines.push('Gesendet von: ' + senderName);
  lines.push('');

  if (senderComment) {
    lines.push('─────────────────────────────');
    lines.push('KOMMENTAR');
    lines.push('─────────────────────────────');
    lines.push(senderComment);
    lines.push('');
  }

  const groups = { yes: [], maybe: [] };
  state.models.forEach(m => {
    const v = state.votes[m.id];
    if (v === 'yes') groups.yes.push(m);
    else if (v === 'maybe') groups.maybe.push(m);
  });

  // Falls nichts ausgewählt: kurzer Hinweis
  if (groups.yes.length === 0 && groups.maybe.length === 0) {
    lines.push('(Noch keine Kandidat:innen mit Ja oder Vielleicht markiert.)');
    return lines;
  }

  const sections = [
    { key: 'yes', label: '✓ JA' },
    { key: 'maybe', label: '? VIELLEICHT' },
  ];

  sections.forEach(s => {
    if (groups[s.key].length === 0) return;
    lines.push('─────────────────────────────');
    lines.push(`${s.label} (${groups[s.key].length})`);
    lines.push('─────────────────────────────');
    groups[s.key].forEach(m => {
      lines.push(`• ${m.name}${m.category ? '  ·  ' + m.category : ''}${m.location ? '  ·  ' + m.location : ''}`);
      if (m.availability) lines.push(`    Verfügbarkeit: ${m.availability}`);
      if (m.travel) lines.push(`    Anreise: ${m.travel}`);
      if (m.notes) lines.push(`    Hinweis (Agentur): ${m.notes}`);
      if (state.notes[m.id]) lines.push(`    Unsere Notiz: ${state.notes[m.id]}`);
      if (m.setcardUrl) lines.push(`    Setcard: ${m.setcardUrl}`);
      lines.push('');
    });
  });
  return lines;
}

/* ---------- TOAST ---------- */
let toastTimer;
function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $toast.classList.remove('is-visible'), 2400);
}

/* ---------- HELPERS ---------- */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }
function getInitials(name) {
  if (!name) return '·';
  return name.split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
}
function isAvailable(s) {
  if (!s) return false;
  return s.toLowerCase().startsWith('verfügbar');
}
function getAvailClass(s) {
  if (!s) return '';
  const lower = s.toLowerCase();
  if (lower.startsWith('verfügbar')) return 'is-good';
  if (lower.includes('offen') || lower.includes('keine rückmeldung')) return '';
  if (lower.includes('option') || lower.includes('rückmeldung folgt')) return '';
  return '';
}
function isTravelWarning(s) {
  if (!s) return false;
  const lower = s.toLowerCase();
  return lower.includes('flug') || lower.includes('achtung') || lower.includes('übernachtung');
}
function agencyVoteLabel(vote) {
  return ({ fav: 'Agentur-Fav', second: 'Second Choice', neu: 'Neu' })[vote] || '';
}
function getImages(m) {
  if (Array.isArray(m.imageUrls) && m.imageUrls.length > 0) return m.imageUrls;
  if (m.imageUrl) return [m.imageUrl];
  return [];
}
function clampIdx(i, len) {
  if (!len) return 0;
  i = i | 0;
  if (i < 0) return 0;
  if (i >= len) return len - 1;
  return i;
}
function getAgencyTagHtml(vote) {
  const label = agencyVoteLabel(vote);
  if (!label) return '';
  const cls = ({ fav: 'is-fav', second: 'is-second', neu: 'is-neu' })[vote];
  return `<span class="card-agency-tag ${cls}">${label}</span>`;
}

/* ---------- FALLBACK DATA (falls models.json nicht lädt) ---------- */
const FALLBACK_MODELS = [
  {
    "id": "demo-1",
    "name": "Demo Person",
    "category": "Spiritualistin",
    "status": "Favorit",
    "imageUrl": null,
    "setcardUrl": "https://example.com",
    "agencyUrl": "https://example.com",
    "location": "Wien",
    "availability": "Verfügbar",
    "travel": "Wien (vor Ort)",
    "notes": "Fallback-Datensatz. Bitte models.json laden."
  }
];

/* ---------- INIT ---------- */
async function init() {
  loadStorage();
  await loadModels();
  renderCategoryFilters();
  renderGrid();
}
init();
