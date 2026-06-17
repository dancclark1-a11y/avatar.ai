import { FIGURES, SAVED_CHATS, SAVED_QUOTES, FAVORITE_FIGURES } from '../data.js';

export function renderLibraryPage() {
  // Saved chats
  const savedChatsHtml = SAVED_CHATS.length
    ? SAVED_CHATS.map(chat => {
        const fig = FIGURES.find(f => f.id === chat.figureId);
        return `
          <div class="saved-chat-item" data-figure-id="${chat.figureId}">
            <div class="saved-chat-portrait">
              ${fig?.portrait
                ? `<img src="${fig.portrait}" alt="${fig.name}">`
                : `<div class="msg-avatar-placeholder">${fig?.name?.[0] ?? '?'}</div>`}
            </div>
            <div class="saved-chat-info">
              <div class="saved-chat-title">${chat.title}</div>
              <div class="saved-chat-meta">${fig?.name ?? 'Unknown'} · ${chat.date}</div>
            </div>
          </div>
        `;
      }).join('')
    : `<div class="library-empty">No saved chats yet. Start a conversation and save it here.</div>`;

  // Saved quotes
  const savedQuotesHtml = SAVED_QUOTES.length
    ? SAVED_QUOTES.map(q => `
        <div class="saved-quote-item" data-figure-id="${q.figureId}">
          <div class="saved-quote-text">"${q.text}"</div>
          <div class="saved-quote-attr">— ${q.figure}</div>
        </div>
      `).join('')
    : `<div class="library-empty">No saved quotes yet.</div>`;

  // Favorite figures
  const favs = FAVORITE_FIGURES.map(id => FIGURES.find(f => f.id === id)).filter(Boolean);
  const favFigsHtml = favs.length
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
              <div class="fav-figure-tag">${fig.tags[0]}</div>
            </div>
          </div>
        `).join('')}
      </div>`
    : `<div class="library-empty">No favorite figures yet.</div>`;

  return `
    <div class="library-page page page-enter">

      <div class="page-title">Library</div>

      <div class="library-section">
        <div class="library-section-title">Saved Chats</div>
        ${savedChatsHtml}
      </div>

      <div class="library-section">
        <div class="library-section-title">Saved Quotes</div>
        ${savedQuotesHtml}
      </div>

      <div class="library-section">
        <div class="library-section-title">Favorite Figures</div>
        ${favFigsHtml}
      </div>

    </div>
  `;
}

export function initLibraryPage({ onSelectFigure }) {
  document.querySelectorAll('[data-figure-id]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.figureId;
      if (id) onSelectFigure(id);
    });
  });
}
