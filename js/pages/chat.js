import { ChatMessage, ThinkingIndicator, SuggestedChips } from '../components.js';

const DEFAULT_CHIPS = [
  'Give me a brutal answer',
  'Explain that historically',
  'Challenge my view',
  'Apply this to modern life',
  'Say more about that',
];

export function renderChatPage(figureId, figures) {
  const figure = figures.find(f => f.id === figureId) ?? figures[0];
  const hasVoice = !!figure.voiceId;

  const imgHtml = figure.portrait
    ? `<img id="chat-portrait-img" src="${figure.portrait}" alt="${figure.name}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="chat-hero-placeholder" style="display:none">${figure.name[0]}</div>`
    : `<div class="chat-hero-placeholder">${figure.name[0]}</div>`;

  const openingMsg = ChatMessage({ role: 'figure', text: figure.opening, figure });

  return `
    <div class="chat-page" data-figure-id="${figure.id}">

      <!-- Large centered portrait -->
      <div class="chat-hero">
        <div class="chat-hero-media" id="chat-avatar-media">
          <div class="chat-rendering-ring"></div>
          ${imgHtml}
          <video id="chat-portrait-video" playsinline></video>
        </div>
        <div class="chat-hero-name">${figure.name}</div>
        <div class="chat-hero-identity">${figure.role} · ${figure.era}</div>
        <div class="chat-hero-status" id="chat-status"></div>
      </div>

      <!-- Messages -->
      <div class="chat-messages" id="chat-messages">
        ${openingMsg}
      </div>

      <!-- Suggested chips -->
      <div class="chips-row" id="chips-row">
        ${SuggestedChips(figure.chips?.length ? figure.chips : DEFAULT_CHIPS)}
      </div>

      <!-- Input area -->
      <div class="chat-input-area">
        <div class="chat-toggles" id="chat-toggles">
          <label class="tog ${!hasVoice ? 'tog-disabled' : ''}">
            <input type="checkbox" id="tog-voice" ${hasVoice ? 'checked' : ''} ${!hasVoice ? 'disabled' : ''}>
            <span>Voice</span>
          </label>
          <label class="tog ${!hasVoice ? 'tog-disabled' : ''}">
            <input type="checkbox" id="tog-video" ${hasVoice ? 'checked' : ''} ${!hasVoice ? 'disabled' : ''}>
            <span>Talking head</span>
          </label>
          <label class="tog">
            <input type="checkbox" id="tog-text" ${!hasVoice ? 'checked' : ''}>
            <span>Text only</span>
          </label>
        </div>
        <div class="chat-input-box">
          <textarea
            class="chat-input"
            id="chat-input"
            placeholder="Ask ${figure.name} anything…"
            rows="1"
          ></textarea>
          <button class="btn-send" id="btn-send" title="Send">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <div class="input-footer">Shift + Enter for a new line</div>
      </div>

    </div>
  `;
}

/* Read current toggle state — called by app.js when wiring up TTS/video */
export function getToggles() {
  return {
    voice: document.getElementById('tog-voice')?.checked ?? false,
    video: document.getElementById('tog-video')?.checked ?? false,
  };
}

export function initChatPage(figureId, figures, { onSendMessage } = {}) {
  const figure   = figures.find(f => f.id === figureId) ?? figures[0];
  const input    = document.getElementById('chat-input');
  const sendBtn  = document.getElementById('btn-send');
  const msgsEl   = document.getElementById('chat-messages');
  const chipsRow = document.getElementById('chips-row');
  const togVoice = document.getElementById('tog-voice');
  const togVideo = document.getElementById('tog-video');
  const togText  = document.getElementById('tog-text');

  if (!input || !sendBtn || !msgsEl) return;

  // ── Toggle interactions ──────────────────
  togVoice?.addEventListener('change', () => {
    if (!togVoice.checked) togVideo.checked = false;
    if (togVoice.checked || togVideo.checked) togText.checked = false;
  });
  togVideo?.addEventListener('change', () => {
    if (togVideo.checked) { togVoice.checked = true; togText.checked = false; }
  });
  togText?.addEventListener('change', () => {
    const on = togText.checked;
    if (on) { togVoice.checked = false; togVideo.checked = false; }
    [togVoice, togVideo].forEach(t => {
      if (t) t.closest('.tog')?.classList.toggle('tog-disabled', on && !figure.voiceId);
    });
  });

  // ── Input ────────────────────────────────
  input.addEventListener('input', autoResize);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  sendBtn.addEventListener('click', send);

  chipsRow?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    input.value = decodeURIComponent(chip.dataset.prompt);
    autoResize();
    input.focus();
  });

  // Save-quote button delegation
  msgsEl.addEventListener('click', e => {
    const btn = e.target.closest('.btn-save-quote');
    if (!btn) return;
    const quote = {
      text:     btn.dataset.quote,
      figure:   btn.dataset.figure,
      figureId: btn.dataset.figureId,
      date:     new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    const existing = JSON.parse(localStorage.getItem('avatar_quotes') ?? '[]');
    if (!existing.find(q => q.text === quote.text)) {
      existing.unshift(quote);
      localStorage.setItem('avatar_quotes', JSON.stringify(existing));
    }
    btn.classList.add('saved');
    btn.title = 'Saved!';
    setTimeout(() => { btn.classList.remove('saved'); btn.title = 'Save quote'; }, 1500);
  });

  input.focus();

  function autoResize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }

  function send() {
    const text = input.value.trim();
    if (!text) return;
    appendMessage({ role: 'user', text, figure });
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    showThinking();

    if (onSendMessage) {
      onSendMessage(text, figure, {
        onReply: reply => {
          hideThinking();
          appendMessage({ role: 'figure', text: reply, figure });
          sendBtn.disabled = false;
        },
        onError: () => {
          hideThinking();
          appendMessage({ role: 'figure', text: 'Something went wrong. Please try again.', figure });
          sendBtn.disabled = false;
        },
      });
    }
  }

  function appendMessage(data) {
    const el = document.createElement('div');
    el.innerHTML = ChatMessage(data);
    msgsEl.appendChild(el.firstElementChild);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function showThinking() {
    const el = document.createElement('div');
    el.innerHTML = ThinkingIndicator(figure);
    msgsEl.appendChild(el.firstElementChild);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function hideThinking() {
    document.getElementById('thinking-indicator')?.remove();
  }
}
