const USAGE_KEY       = 'avatar_usage';
const COLLECTIONS_KEY = 'avatar_collections';
const QUOTES_KEY      = 'avatar_quotes';
const JOURNAL_KEY     = 'avatar_journal';

const PRESET_COLLECTIONS = [
  { id: 'preset_mind',    name: 'Mind'    },
  { id: 'preset_body',    name: 'Body'    },
  { id: 'preset_soul',    name: 'Soul'    },
  { id: 'preset_success', name: 'Success' },
];

// ─── localStorage helpers ─────────────────
function getUsage() {
  try { return JSON.parse(localStorage.getItem(USAGE_KEY) ?? '{}'); }
  catch { return {}; }
}

function getCollections() {
  const raw = localStorage.getItem(COLLECTIONS_KEY);
  if (raw) { try { return JSON.parse(raw); } catch { /* fall through */ } }
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(PRESET_COLLECTIONS));
  return [...PRESET_COLLECTIONS];
}

function saveCollections(collections) {
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
}

function getQuotes() {
  try { return JSON.parse(localStorage.getItem(QUOTES_KEY) ?? '[]'); }
  catch { return []; }
}

function getJournalEntries(collectionId) {
  try {
    const all = JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? '{}');
    return all[collectionId] ?? [];
  } catch { return []; }
}

function saveJournalEntry(collectionId, text) {
  const all = (() => { try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? '{}'); } catch { return {}; } })();
  if (!all[collectionId]) all[collectionId] = [];
  all[collectionId].unshift({ text, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) });
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(all));
}

function deleteJournalEntry(collectionId, index) {
  const all = (() => { try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? '{}'); } catch { return {}; } })();
  if (all[collectionId]) {
    all[collectionId].splice(index, 1);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(all));
  }
}

function getFavorites(figures) {
  const usage = getUsage();
  return figures
    .filter(f => (usage[f.id] ?? 0) > 0)
    .sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0))
    .slice(0, 6);
}

// ─── Render ───────────────────────────────
export function renderLibraryPage(figures) {
  const favs        = getFavorites(figures);
  const collections = getCollections();
  const quotes      = getQuotes();

  const favsHtml = favs.length
    ? `<div class="fav-figures-list">
        ${favs.map(fig => `
          <div class="fav-figure-item" data-figure-id="${fig.id}">
            <div class="fav-figure-portrait">
              ${fig.portrait
                ? `<img src="${fig.portrait}" alt="${fig.name}">`
                : `<div class="msg-avatar-placeholder">${fig.name[0]}</div>`}
            </div>
            <div>
              <div class="fav-figure-name">${fig.name}</div>
              <div class="fav-figure-tag">${fig.tags?.[0] ?? ''}</div>
            </div>
          </div>
        `).join('')}
      </div>`
    : `<div class="library-empty">Talk with figures and your most-visited ones appear here automatically.</div>`;

  const quotesHtml = quotes.length
    ? quotes.map((q, i) => `
        <div class="saved-quote-item" data-quote-index="${i}">
          <div class="saved-quote-text">"${q.text}"</div>
          <div class="saved-quote-attr">— ${q.figure} · ${q.date}</div>
          <button class="btn-delete-quote" data-index="${i}" title="Remove">✕</button>
        </div>
      `).join('')
    : `<div class="library-empty">Tap the bookmark icon on any figure's message to save a quote here.</div>`;

  const collectionsHtml = `
    <div class="collection-grid" id="collection-grid">
      ${collections.map(col => `
        <div class="collection-card" data-collection-id="${col.id}">${col.name}</div>
      `).join('')}
      <button class="collection-add-btn" id="btn-add-collection" title="New collection">+</button>
    </div>
    <div class="collection-add-form" id="collection-add-form">
      <input type="text" id="collection-name-input" placeholder="Collection name…" maxlength="32" autocomplete="off">
      <button class="btn-save-collection" id="btn-save-collection">Save</button>
      <button class="btn-cancel-collection" id="btn-cancel-collection">Cancel</button>
    </div>
    <div class="collection-journal" id="collection-journal" style="display:none">
      <div class="collection-journal-header">
        <span class="collection-journal-title" id="journal-title"></span>
        <button class="btn-close-journal" id="btn-close-journal">✕</button>
      </div>
      <div class="journal-entries" id="journal-entries"></div>
      <div class="journal-compose">
        <textarea class="journal-textarea" id="journal-textarea" placeholder="Write a thought…" rows="3"></textarea>
        <button class="journal-save-btn" id="journal-save-btn">Save Entry</button>
      </div>
    </div>
  `;

  return `
    <div class="library-page page page-enter">

      <div class="page-title">Library</div>

      <div class="library-section">
        <div class="library-section-title">Favorite Figures</div>
        ${favsHtml}
      </div>

      <div class="library-section">
        <div class="library-section-title">Collections & Journal</div>
        ${collectionsHtml}
      </div>

      <div class="library-section">
        <div class="library-section-title">Saved Quotes</div>
        <div id="quotes-list">${quotesHtml}</div>
      </div>

    </div>
  `;
}

// ─── Init ─────────────────────────────────
export function initLibraryPage({ onSelectFigure }) {
  // Favorite figure clicks
  document.querySelectorAll('.fav-figure-item').forEach(el => {
    el.addEventListener('click', () => { if (el.dataset.figureId) onSelectFigure(el.dataset.figureId); });
  });

  // Delete saved quote
  document.getElementById('quotes-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.btn-delete-quote');
    if (!btn) return;
    const index = parseInt(btn.dataset.index, 10);
    const quotes = getQuotes();
    quotes.splice(index, 1);
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
    // Re-render quotes list
    const list = document.getElementById('quotes-list');
    if (list) list.innerHTML = quotes.length
      ? quotes.map((q, i) => `
          <div class="saved-quote-item" data-quote-index="${i}">
            <div class="saved-quote-text">"${q.text}"</div>
            <div class="saved-quote-attr">— ${q.figure} · ${q.date}</div>
            <button class="btn-delete-quote" data-index="${i}" title="Remove">✕</button>
          </div>
        `).join('')
      : `<div class="library-empty">Tap the bookmark icon on any figure's message to save a quote here.</div>`;
  });

  // Collection add form
  const addBtn    = document.getElementById('btn-add-collection');
  const addForm   = document.getElementById('collection-add-form');
  const nameInput = document.getElementById('collection-name-input');
  const saveBtn   = document.getElementById('btn-save-collection');
  const cancelBtn = document.getElementById('btn-cancel-collection');

  addBtn?.addEventListener('click', () => {
    addForm.classList.add('open');
    nameInput.value = '';
    nameInput.focus();
  });
  cancelBtn?.addEventListener('click', () => addForm.classList.remove('open'));
  nameInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveCollection();
    if (e.key === 'Escape') addForm.classList.remove('open');
  });
  saveBtn?.addEventListener('click', saveCollection);

  function saveCollection() {
    const name = nameInput.value.trim();
    if (!name) return;
    const collections = getCollections();
    const newCol = { id: `user_${Date.now()}`, name };
    collections.push(newCol);
    saveCollections(collections);
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.dataset.collectionId = newCol.id;
    card.textContent = newCol.name;
    card.addEventListener('click', () => openJournal(newCol.id, newCol.name));
    document.getElementById('collection-grid')?.insertBefore(card, addBtn);
    addForm.classList.remove('open');
    nameInput.value = '';
  }

  // Collection card → open journal
  document.querySelectorAll('.collection-card').forEach(card => {
    card.addEventListener('click', () => openJournal(card.dataset.collectionId, card.textContent.trim()));
  });

  // Journal panel
  const journalPanel   = document.getElementById('collection-journal');
  const journalTitle   = document.getElementById('journal-title');
  const journalEntries = document.getElementById('journal-entries');
  const journalTextarea = document.getElementById('journal-textarea');
  const journalSaveBtn = document.getElementById('journal-save-btn');
  const closeJournalBtn = document.getElementById('btn-close-journal');
  let activeCollectionId = null;

  function openJournal(collectionId, name) {
    activeCollectionId = collectionId;
    if (journalTitle)  journalTitle.textContent = name;
    renderJournalEntries(collectionId);
    if (journalPanel) journalPanel.style.display = '';
    journalTextarea?.focus();
  }

  function renderJournalEntries(collectionId) {
    const entries = getJournalEntries(collectionId);
    if (!journalEntries) return;
    journalEntries.innerHTML = entries.length
      ? entries.map((entry, i) => `
          <div class="journal-entry">
            <div class="journal-entry-date">${entry.date}</div>
            <div class="journal-entry-text">${entry.text.replace(/\n/g, '<br>')}</div>
            <button class="btn-delete-journal-entry" data-index="${i}" title="Delete">✕</button>
          </div>
        `).join('')
      : `<div class="library-empty" style="padding:12px 0">No entries yet. Write your first one below.</div>`;

    journalEntries.querySelectorAll('.btn-delete-journal-entry').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteJournalEntry(activeCollectionId, parseInt(btn.dataset.index, 10));
        renderJournalEntries(activeCollectionId);
      });
    });
  }

  closeJournalBtn?.addEventListener('click', () => {
    if (journalPanel) journalPanel.style.display = 'none';
    activeCollectionId = null;
  });

  journalSaveBtn?.addEventListener('click', () => {
    const text = journalTextarea?.value.trim();
    if (!text || !activeCollectionId) return;
    saveJournalEntry(activeCollectionId, text);
    journalTextarea.value = '';
    renderJournalEntries(activeCollectionId);
  });

  journalTextarea?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      journalSaveBtn?.click();
    }
  });
}

// ─── Usage tracking (called from app.js) ─
export function trackUsage(figureId) {
  const usage = getUsage();
  usage[figureId] = (usage[figureId] ?? 0) + 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
}
