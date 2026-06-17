import { FigureCard } from '../components.js';

const FILTER_TAGS = ['Power', 'Faith', 'Discipline', 'Strategy', 'Love', 'Philosophy', 'Psychology', 'Music', 'Science', 'Leadership'];

export function renderExplorePage(figures) {
  return `
    <div class="explore-page page page-enter">

      <div class="page-title">Historical Figures</div>

      <div class="explore-search">
        <input
          type="text"
          id="explore-search"
          placeholder="Search by name, era, or topic…"
          autocomplete="off"
        >
      </div>

      <div class="filter-chips" id="filter-chips">
        ${FILTER_TAGS.map(tag =>
          `<button class="filter-chip" data-tag="${tag}">${tag}</button>`
        ).join('')}
      </div>

      <div class="figures-grid" id="figures-grid">
        ${figures.map(FigureCard).join('')}
      </div>

    </div>
  `;
}

export function initExplorePage({ onSelectFigure }) {
  const searchInput = document.getElementById('explore-search');
  const filterRow   = document.getElementById('filter-chips');
  const grid        = document.getElementById('figures-grid');

  // Capture the rendered figures from the grid data attributes
  const allCards = Array.from(grid?.querySelectorAll('.figure-card') ?? []);
  let activeTag   = null;
  let searchQuery = '';

  searchInput?.addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderGrid();
  });

  filterRow?.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    const tag = chip.dataset.tag;
    activeTag = activeTag === tag ? null : tag;
    document.querySelectorAll('.filter-chip').forEach(c =>
      c.classList.toggle('active', c.dataset.tag === activeTag)
    );
    renderGrid();
  });

  grid?.addEventListener('click', e => {
    const card = e.target.closest('.figure-card');
    if (card) onSelectFigure(card.dataset.figureId);
  });

  function renderGrid() {
    if (!grid) return;
    const results = allCards.filter(card => {
      const name     = (card.dataset.name ?? '').toLowerCase();
      const desc     = (card.dataset.description ?? '').toLowerCase();
      const tags     = (card.dataset.tags ?? '').toLowerCase();
      const era      = (card.dataset.era ?? '').toLowerCase();
      const keywords = (card.dataset.keywords ?? '').toLowerCase();
      const matchSearch = !searchQuery
        || name.includes(searchQuery)
        || desc.includes(searchQuery)
        || tags.includes(searchQuery)
        || era.includes(searchQuery)
        || keywords.includes(searchQuery);
      const matchTag = !activeTag || tags.includes(activeTag.toLowerCase());
      return matchSearch && matchTag;
    });

    if (results.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:56px 0;color:var(--text-tertiary);font-size:14px;">
          No figures match your search.
        </div>`;
    } else {
      // Show/hide in place instead of re-rendering
      allCards.forEach(card => {
        card.style.display = results.includes(card) ? '' : 'none';
      });
    }
  }
}
