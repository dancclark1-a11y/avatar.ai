import { FIGURES, PROMPT_CARDS } from '../data.js';
import { FigureCard, PromptCard } from '../components.js';

export function renderHomePage() {
  return `
    <div class="home-page page page-enter">

      <div class="home-hero">
        <h1>Talk with history.</h1>
        <p class="subtitle">
          Ask historical figures about power, faith, discipline, love,
          war, ambition, and modern life.
        </p>
        <div class="hero-actions">
          <button class="btn-primary" id="hero-new-chat">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            New Conversation
          </button>
          <button class="btn-secondary" id="hero-explore">Explore Figures</button>
          <button class="btn-secondary" id="hero-continue">Continue Last Chat</button>
        </div>
      </div>

      <div class="home-section">
        <div class="home-section-title">Start with a question</div>
        <div class="prompt-cards">
          ${PROMPT_CARDS.map(PromptCard).join('')}
        </div>
      </div>

      <div class="home-section">
        <div class="home-section-title">Featured Figures</div>
        <div class="figures-grid">
          ${FIGURES.slice(0, 6).map(FigureCard).join('')}
        </div>
      </div>

    </div>
  `;
}

export function initHomePage({ onNavigate }) {
  document.getElementById('hero-new-chat')
    ?.addEventListener('click', () => onNavigate('/explore'));

  document.getElementById('hero-explore')
    ?.addEventListener('click', () => onNavigate('/explore'));

  document.getElementById('hero-continue')
    ?.addEventListener('click', () => onNavigate('/chat/marcus-aurelius'));

  // Prompt cards
  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', () => onNavigate(`/chat/${card.dataset.figureId}`));
  });

  // Figure cards
  document.querySelectorAll('.figure-card').forEach(card => {
    card.addEventListener('click', () => onNavigate(`/chat/${card.dataset.figureId}`));
  });
}
