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
  const imageHtml = m.imageUrl
    ? `<img src="${escapeAttr(m.imageUrl)}" alt="${escapeAttr(m.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
       <div class="card-image-placeholder" style="display:none;">${escapeHtml(initials)}</div>`
    : `<div class="card-image-placeholder">${escapeHtml(initials)}</div>`;

  return `
    <article class="card ${voteClass}" data-id="${escapeAttr(m.id)}">
      <div class="card-image" data-action="open">
        ${imageHtml}
        ${m.status ? `<span class="card-status-tag ${statusClass}">${escapeHtml(m.status)}</span>` : ''}
      </div>
      <div class="card-body">
        ${m.category ? `<div class="card-category">${escapeHtml(m.category)}</div>` : ''}
        <h2 class="card-name">${escapeHtml(m.name || 'Unbenannt')}</h2>
        ${m.location ? `<p class="card-meta">${escapeHtml(m.location)}</p>` : ''}

        <div class="card-info">
          <div class="info-row">
            <span class="info-label">Verf.</span>
            <span class="info-value ${availClass}">${escapeHtml(m.availability || '—')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Anreise</span>
            <span class="info-value ${travelClass}">${escapeHtml(m.travel || '—')}</span>
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
  const imageHtml = m.imageUrl
    ? `<img src="${escapeAttr(m.imageUrl)}" alt="${escapeAttr(m.name)}" />`
    : `<div class="card-image-placeholder">${escapeHtml(initials)}</div>`;

  const note = state.notes[id] || '';

  $modalInner.innerHTML = `
    <div class="modal-hero">${imageHtml}</div>
    <div class="modal-body">
      ${m.category ? `<div class="modal-cat">${escapeHtml(m.category)} · ${escapeHtml(m.status || '')}</div>` : ''}
      <h2 class="modal-name" id="modalName">${escapeHtml(m.name || '')}</h2>
      ${m.location ? `<p class="modal-location">${escapeHtml(m.location)}</p>` : ''}

      <div class="modal-detail">
        <div class="modal-detail-label">Verfügbarkeit</div>
        <div class="modal-detail-value ${availClass}">${escapeHtml(m.availability || '—')}</div>
      </div>
      <div class="modal-detail">
        <div class="modal-detail-label">Anreise</div>
        <div class="modal-detail-value ${travelClass}">${escapeHtml(m.travel || '—')}</div>
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
  if (e.target.hasAttribute('data-close')) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $modal.getAttribute('aria-hidden') === 'false') closeModal();
});

/* ---------- SEND RESULTS ---------- */
const WEB3FORMS_KEY = '1dce030d-d365-4be5-a295-c82daee54fb4';

$copyBtn.addEventListener('click', async () => {
  const lines = buildResultText();
  const text = lines.join('\n');

  // Falls niemand markiert: gar nicht erst senden
  const hasSelection = state.models.some(m => {
    const v = state.votes[m.id];
    return v === 'yes' || v === 'maybe';
  });
  if (!hasSelection) {
    showToast('Keine Auswahl getroffen');
    return;
  }

  // Button-State: sending
  const originalLabel = $copyBtn.querySelector('.floating-btn-label').textContent;
  setBtnState('sending');

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: 'Casting-Auswahl RE/MAX × Wexplore',
        from_name: 'Casting-Tool',
        message: text,
        // honeypot leer lassen
        botcheck: ''
      })
    });
    const data = await res.json();
    if (data.success) {
      setBtnState('sent');
      showToast('Auswahl an Wexplore gesendet ✓');
      // Nach 3s zurück zum Normalzustand
      setTimeout(() => setBtnState('idle', originalLabel), 3000);
    } else {
      throw new Error(data.message || 'Sendung fehlgeschlagen');
    }
  } catch (err) {
    console.warn('Send failed, falling back to copy', err);
    setBtnState('idle', originalLabel);
    // Fallback: in Zwischenablage kopieren
    try {
      await navigator.clipboard.writeText(text);
      showToast('Senden fehlgeschlagen — in Zwischenablage kopiert');
    } catch (e) {
      const w = window.open('', '_blank');
      if (w) {
        w.document.body.innerHTML = `<pre style="font-family:sans-serif;padding:20px;white-space:pre-wrap;">${escapeHtml(text)}</pre>`;
      }
      showToast('Bitte Text manuell kopieren');
    }
  }
});

function setBtnState(mode, originalLabel) {
  const $label = $copyBtn.querySelector('.floating-btn-label');
  const $icon  = $copyBtn.querySelector('.floating-btn-icon');
  $copyBtn.classList.remove('is-sending', 'is-sent');
  if (mode === 'sending') {
    $copyBtn.classList.add('is-sending');
    $copyBtn.disabled = true;
    $label.textContent = 'Wird gesendet …';
    $icon.textContent = '';
  } else if (mode === 'sent') {
    $copyBtn.classList.add('is-sent');
    $copyBtn.disabled = true;
    $label.textContent = 'Gesendet';
    $icon.textContent = '✓';
  } else {
    $copyBtn.disabled = false;
    $label.textContent = originalLabel || 'Auswahl an Wexplore senden';
    $icon.textContent = '→';
  }
}

function buildResultText() {
  const lines = [];
  lines.push('CASTING AUSWAHL — RE/MAX × WEXPLORE');
  lines.push('Stand: ' + new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  lines.push('');

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
