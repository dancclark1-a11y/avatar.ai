const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'bug',     label: 'Bug'     },
  { id: 'idea',    label: 'Idea'    },
];

export function renderFeedbackPage() {
  return `
    <div class="feedback-page page page-enter">

      <div class="page-title">Feedback</div>
      <p class="feedback-subtitle">What's on your mind? All feedback goes directly to the creator.</p>

      <div class="feedback-form" id="feedback-form">
        <div class="feedback-category-row">
          ${CATEGORIES.map((c, i) => `
            <label class="tog ${i === 0 ? 'tog-checked' : ''}">
              <input type="radio" name="feedback-type" value="${c.id}" ${i === 0 ? 'checked' : ''}>
              ${c.label}
            </label>
          `).join('')}
        </div>

        <textarea
          class="feedback-textarea"
          id="feedback-message"
          placeholder="Write your feedback here…"
          rows="5"
          maxlength="2000"
        ></textarea>

        <div class="feedback-char-count" id="feedback-char-count">0 / 2000</div>

        <button class="feedback-submit-btn" id="feedback-submit">Send Feedback</button>

        <div class="feedback-error" id="feedback-error"></div>
      </div>

      <div class="feedback-success" id="feedback-success" style="display:none">
        <div class="feedback-success-icon">✓</div>
        <div class="feedback-success-title">Thank you</div>
        <div class="feedback-success-body">Your feedback was received.</div>
        <button class="feedback-again-btn" id="feedback-again">Send more</button>
      </div>

      <!-- Creator inbox — only visible once loaded -->
      <div id="feedback-inbox" style="display:none">
        <div class="page-title" style="margin-top:48px;font-size:18px">Inbox</div>
        <div id="feedback-inbox-list"></div>
      </div>

    </div>
  `;
}

export function initFeedbackPage(accessCode) {
  const form      = document.getElementById('feedback-form');
  const success   = document.getElementById('feedback-success');
  const textarea  = document.getElementById('feedback-message');
  const submitBtn = document.getElementById('feedback-submit');
  const errorEl   = document.getElementById('feedback-error');
  const charCount = document.getElementById('feedback-char-count');
  const againBtn  = document.getElementById('feedback-again');

  // Category toggles
  document.querySelectorAll('.feedback-category-row .tog').forEach(label => {
    label.addEventListener('click', () => {
      document.querySelectorAll('.feedback-category-row .tog').forEach(l => l.classList.remove('tog-checked'));
      label.classList.add('tog-checked');
    });
  });

  textarea?.addEventListener('input', () => {
    const len = textarea.value.length;
    if (charCount) charCount.textContent = `${len} / 2000`;
  });

  submitBtn?.addEventListener('click', submit);

  againBtn?.addEventListener('click', () => {
    success.style.display = 'none';
    form.style.display = '';
    textarea.value = '';
    if (charCount) charCount.textContent = '0 / 2000';
    const first = document.querySelector('.feedback-category-row input');
    if (first) first.checked = true;
    document.querySelectorAll('.feedback-category-row .tog').forEach((l, i) => l.classList.toggle('tog-checked', i === 0));
  });

  async function submit() {
    const message = textarea?.value.trim();
    if (!message) { showError('Please write something before sending.'); return; }
    const type = document.querySelector('input[name="feedback-type"]:checked')?.value ?? 'general';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    errorEl.textContent = '';
    try {
      const res = await fetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-code': accessCode },
        body: JSON.stringify({ type, message }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      form.style.display = 'none';
      success.style.display = '';
    } catch {
      showError('Could not send feedback. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Feedback';
    }
  }

  function showError(msg) {
    if (errorEl) errorEl.textContent = msg;
  }

  // Load inbox (creator view)
  loadInbox(accessCode);
}

async function loadInbox(accessCode) {
  try {
    const res = await fetch('/feedback-log', { headers: { 'x-access-code': accessCode } });
    if (!res.ok) return;
    const entries = await res.json();
    if (!entries.length) return;

    const inbox     = document.getElementById('feedback-inbox');
    const inboxList = document.getElementById('feedback-inbox-list');
    if (!inbox || !inboxList) return;

    inboxList.innerHTML = [...entries].reverse().map(e => {
      const date = new Date(e.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const typeBadge = `<span class="feedback-type-badge feedback-type-${e.type ?? 'general'}">${e.type ?? 'general'}</span>`;
      return `
        <div class="feedback-inbox-item">
          <div class="feedback-inbox-meta">${typeBadge} <span class="feedback-inbox-date">${date}</span></div>
          <div class="feedback-inbox-message">${e.message ?? ''}</div>
        </div>
      `;
    }).join('');

    inbox.style.display = '';
  } catch {
    // Not creator or no feedback yet — silently skip
  }
}
