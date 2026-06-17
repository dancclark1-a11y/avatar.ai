// ─────────────────────────────────────────
//  Reusable UI component functions
//  Each returns an HTML string.
// ─────────────────────────────────────────

import { FIGURES } from './data.js';

/* Portrait helper — image with initial fallback */
export function portraitHtml(figure, { size = 'full', className = '' } = {}) {
  const cls = className || 'figure-portrait-placeholder';
  if (figure?.portrait) {
    return `
      <img src="${figure.portrait}" alt="${figure.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="${cls}" style="display:none">${figure.name[0]}</div>
    `;
  }
  return `<div class="${cls}">${figure?.name?.[0] ?? '?'}</div>`;
}

/* ── FigureCard ── */
export function FigureCard(figure) {
  const img = figure.portrait
    ? `<img src="${figure.portrait}" alt="${figure.name}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="figure-portrait-placeholder" style="display:none">${figure.name[0]}</div>`
    : `<div class="figure-portrait-placeholder">${figure.name[0]}</div>`;

  return `
    <div class="figure-card"
         data-figure-id="${figure.id}"
         data-name="${figure.name}"
         data-description="${figure.description ?? ''}"
         data-tags="${(figure.tags ?? []).join(',')}"
         data-era="${figure.era ?? ''}"
         role="button" tabindex="0">
      <div class="figure-card-portrait-wrap">${img}</div>
      <div class="figure-card-body">
        <div class="figure-card-name">${figure.name}</div>
        <div class="figure-card-era">${figure.era}</div>
        <div class="figure-card-desc">${figure.description}</div>
        <div class="figure-tags">
          ${figure.tags.slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
        <button class="btn-start-chat">Start Chat →</button>
      </div>
    </div>
  `;
}

/* ── PromptCard ── */
export function PromptCard(prompt) {
  const figure = FIGURES.find(f => f.id === prompt.figureId);
  const imgHtml = figure?.portrait
    ? `<img src="${figure.portrait}" alt="${figure?.name ?? ''}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="prompt-card-initial" style="display:none">${figure?.name?.[0] ?? '?'}</div>`
    : `<div class="prompt-card-initial">${figure?.name?.[0] ?? '?'}</div>`;

  return `
    <div class="prompt-card"
         data-figure-id="${prompt.figureId}"
         data-prompt="${encodeURIComponent(prompt.prompt ?? prompt.text)}"
         role="button" tabindex="0">
      <div class="prompt-card-portrait">${imgHtml}</div>
      <span class="prompt-card-text">${prompt.text}</span>
    </div>
  `;
}

/* ── ChatMessage ── */
export function ChatMessage({ role, text, figure }) {
  const isUser = role === 'user';
  const avatarHtml = isUser
    ? `<div class="msg-avatar"><div class="msg-avatar-placeholder">Y</div></div>`
    : `<div class="msg-avatar">
         ${figure?.portrait
           ? `<img src="${figure.portrait}" alt="${figure.name}"
                   onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
              <div class="msg-avatar-placeholder" style="display:none">${figure?.name?.[0] ?? 'F'}</div>`
           : `<div class="msg-avatar-placeholder">${figure?.name?.[0] ?? 'F'}</div>`}
       </div>`;

  return `
    <div class="message ${isUser ? 'user-msg' : ''}" style="animation:fadeUp 0.2s ease forwards">
      ${avatarHtml}
      <div class="msg-body">
        <div class="msg-sender">${isUser ? 'You' : figure?.name ?? 'Figure'}</div>
        <div class="msg-text">${escapeHtml(text)}</div>
      </div>
    </div>
  `;
}

/* ── ThinkingIndicator ── */
export function ThinkingIndicator(figure) {
  return `
    <div class="thinking-indicator" id="thinking-indicator">
      <div class="msg-avatar">
        ${figure?.portrait
          ? `<img src="${figure.portrait}" alt="${figure.name}">`
          : `<div class="msg-avatar-placeholder">${figure?.name?.[0] ?? 'F'}</div>`}
      </div>
      <div class="thinking-bubbles">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
}

/* ── SuggestedChips ── */
export function SuggestedChips(chips = []) {
  return chips
    .map(c => `<button class="chip" data-prompt="${encodeURIComponent(c)}">${c}</button>`)
    .join('');
}

/* ── Sidebar convo item ── */
export function ConvoItem(convo, figures) {
  const figure = figures.find(f => f.id === convo.figureId);
  const avatarHtml = figure?.portrait
    ? `<img src="${figure.portrait}" alt="${figure?.name ?? ''}">`
    : `<div class="convo-avatar-placeholder">${figure?.name?.[0] ?? '?'}</div>`;

  return `
    <div class="convo-item" data-figure-id="${convo.figureId}" data-convo-id="${convo.id}">
      <div class="convo-avatar">${avatarHtml}</div>
      <div class="convo-info">
        <div class="convo-title">${convo.title}</div>
        <div class="convo-meta">${figure?.name ?? ''} · ${convo.timestamp}</div>
      </div>
    </div>
  `;
}

/* Escape HTML to prevent XSS in user input */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
