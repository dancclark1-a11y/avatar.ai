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

  const portraitHtml = figure.portrait
    ? `<img src="${figure.portrait}" alt="${figure.name}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="chat-header-portrait-placeholder" style="display:none">${figure.name[0]}</div>`
    : `<div class="chat-header-portrait-placeholder">${figure.name[0]}</div>`;

  const openingMsg = ChatMessage({ role: 'figure', text: figure.opening, figure });

  return `
    <div class="chat-page" data-figure-id="${figure.id}">

      <div class="chat-header">
        <div class="chat-header-portrait">${portraitHtml}</div>
        <div class="chat-header-info">
          <div class="chat-header-name">${figure.name}</div>
          <div class="chat-header-identity">${figure.role} · ${figure.era}</div>
        </div>
      </div>

      <div class="chat-messages" id="chat-messages">
        ${openingMsg}
      </div>

      <div class="chips-row" id="chips-row">
        ${SuggestedChips(figure.chips?.length ? figure.chips : DEFAULT_CHIPS)}
      </div>

      <div class="chat-input-area">
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

export function initChatPage(figureId, figures, { onSendMessage } = {}) {
  const figure   = figures.find(f => f.id === figureId) ?? figures[0];
  const input    = document.getElementById('chat-input');
  const sendBtn  = document.getElementById('btn-send');
  const msgsEl   = document.getElementById('chat-messages');
  const chipsRow = document.getElementById('chips-row');

  if (!input || !sendBtn || !msgsEl) return;

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
          appendMessage({
            role: 'figure',
            text: 'Something went wrong. Please try again.',
            figure,
          });
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
