// ─────────────────────────────────────────
//  avatar.ai — App entry point
// ─────────────────────────────────────────

import { Router }    from './router.js';
import { FIGURES, MOCK_CONVERSATIONS } from './data.js';
import { ConvoItem } from './components.js';

import { renderHomePage,    initHomePage    } from './pages/home.js';
import { renderChatPage,    initChatPage    } from './pages/chat.js';
import { renderExplorePage, initExplorePage } from './pages/explore.js';
import { renderLibraryPage, initLibraryPage } from './pages/library.js';

// ─── State ───────────────────────────────
let ACCESS_CODE = sessionStorage.getItem('access_code') ?? '';
// FIGURES is the live array from data.js — we mutate it in place so all
// modules sharing that import see the server-enriched data.

const sidebarEl = document.getElementById('sidebar');
const mainEl    = document.getElementById('main-content');
const overlayEl = document.getElementById('sidebar-overlay');

// ─── Auth overlay ─────────────────────────
function showAuthOverlay(onSuccess) {
  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'background:#0c0c0a',
    'display:flex', 'align-items:center', 'justify-content:center',
    'z-index:200', 'padding:24px',
  ].join(';');

  overlay.innerHTML = `
    <div style="width:100%;max-width:320px;text-align:center">
      <div style="font-size:22px;font-weight:600;letter-spacing:-0.5px;margin-bottom:8px;color:#e8dcc8;font-family:'Cinzel',serif">
        avatar<span style="color:#c9a84c">.</span>ai
      </div>
      <div style="font-size:14px;color:#6b6355;margin-bottom:32px;line-height:1.5">
        Enter your access code to continue
      </div>
      <input id="auth-input" type="text" placeholder="Access code" autocomplete="off"
        style="width:100%;background:#181716;border:1px solid rgba(255,255,255,0.06);border-radius:8px;
               padding:11px 14px;font-size:14px;color:#e8dcc8;font-family:inherit;
               outline:none;text-align:center;margin-bottom:10px;display:block" />
      <div id="auth-error" style="font-size:12px;color:#b3463f;min-height:18px;margin-bottom:8px"></div>
      <button id="auth-btn"
        style="width:100%;background:#c9a84c;color:#0c0c0a;border:none;border-radius:8px;
               padding:12px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer">
        Enter
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  const input  = overlay.querySelector('#auth-input');
  const btn    = overlay.querySelector('#auth-btn');
  const errEl  = overlay.querySelector('#auth-error');

  input.focus();
  input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
  btn.addEventListener('click', attempt);

  async function attempt() {
    const code = input.value.trim();
    if (!code) return;
    btn.disabled = true;
    btn.textContent = '…';
    errEl.textContent = '';
    try {
      const res = await fetch('/verify', { method: 'POST', headers: { 'x-access-code': code } });
      if (res.ok) {
        ACCESS_CODE = code;
        sessionStorage.setItem('access_code', code);
        overlay.remove();
        onSuccess();
      } else {
        errEl.textContent = 'Incorrect access code.';
        btn.disabled = false;
        btn.textContent = 'Enter';
        input.select();
      }
    } catch {
      errEl.textContent = 'Could not connect to server.';
      btn.disabled = false;
      btn.textContent = 'Enter';
    }
  }
}

// ─── Load figures from server ─────────────
async function loadFigures() {
  try {
    const res = await fetch('/avatars', { headers: { 'x-access-code': ACCESS_CODE } });
    if (!res.ok) return;
    const serverAvatars = await res.json();

    // Merge brain + voiceId into existing FIGURES entries by id
    serverAvatars.forEach(sa => {
      const existing = FIGURES.find(f => f.id === sa.id);
      if (existing) {
        existing.brain   = sa.brain;
        existing.voiceId = sa.voiceId;
      } else {
        // Server has an avatar not in static list — add it
        FIGURES.push({
          id:          sa.id,
          name:        sa.name,
          era:         sa.years,
          role:        sa.location ?? '',
          description: sa.cardDesc ?? '',
          tags:        [],
          portrait:    sa.portrait,
          opening:     sa.opening,
          chips:       [],
          brain:       sa.brain,
          voiceId:     sa.voiceId,
        });
      }
    });

    // Sort by server order field
    const orderMap = Object.fromEntries(serverAvatars.map(sa => [sa.id, sa.order]));
    FIGURES.sort((a, b) => (orderMap[a.id] ?? 999) - (orderMap[b.id] ?? 999));
  } catch (e) {
    console.warn('Could not load figures from server, using static data.', e);
  }
}

// ─── Sidebar ──────────────────────────────
function buildSidebar(activePage = '') {
  sidebarEl.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo" id="sb-logo" style="cursor:pointer">
        avatar<span class="logo-dot">.</span>ai
      </div>
      <button class="btn-new-chat" id="sb-new-chat">
        ${iconPlus()} New Conversation
      </button>
    </div>

    <div class="sidebar-search">
      <input type="text" id="sb-search" placeholder="Search conversations…" autocomplete="off">
    </div>

    <div class="sidebar-recent">
      <div class="sidebar-section-label">Recent</div>
      ${MOCK_CONVERSATIONS.length
        ? MOCK_CONVERSATIONS.map(c => ConvoItem(c, FIGURES)).join('')
        : `<div style="padding:8px 14px;font-size:12px;color:var(--text-tertiary)">No recent conversations</div>`}
    </div>

    <nav class="sidebar-nav">
      ${[
        { id: 'explore', label: 'Explore Figures', path: '/explore', icon: iconSearch() },
        { id: 'library', label: 'Library',         path: '/library', icon: iconBook()   },
      ].map(item => `
        <a class="nav-item ${activePage === item.id ? 'active' : ''}"
           href="#${item.path}" data-page="${item.id}">
          ${item.icon} ${item.label}
        </a>
      `).join('')}
    </nav>

    <div class="sidebar-bottom">
      <a class="nav-item ${activePage === 'settings' ? 'active' : ''}"
         href="#/settings" data-page="settings">
        ${iconSettings()} Settings
      </a>
    </div>
  `;

  document.getElementById('sb-logo')
    ?.addEventListener('click', () => navigate('/'));
  document.getElementById('sb-new-chat')
    ?.addEventListener('click', () => navigate('/explore'));
  sidebarEl.querySelectorAll('.convo-item').forEach(item => {
    item.addEventListener('click', () => navigate(`/chat/${item.dataset.figureId}`));
  });
  sidebarEl.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', closeMobileSidebar);
  });
}

// ─── Mobile sidebar ───────────────────────
function openMobileSidebar()  { sidebarEl.classList.add('mobile-open');    overlayEl.classList.add('visible');    }
function closeMobileSidebar() { sidebarEl.classList.remove('mobile-open'); overlayEl.classList.remove('visible'); }
overlayEl.addEventListener('click', closeMobileSidebar);

// ─── Mobile header ────────────────────────
function mobileHeader(title = 'avatar.ai') {
  return `
    <div class="mobile-header">
      <button class="mobile-menu-btn" id="mob-menu">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <span class="mobile-title">${title}</span>
    </div>
  `;
}
function attachMobileMenu() {
  document.getElementById('mob-menu')?.addEventListener('click', openMobileSidebar);
}

// ─── Navigation ───────────────────────────
let router;
function navigate(path) {
  closeMobileSidebar();
  router.navigate(path);
}

// ─── Routes ───────────────────────────────
function setupRoutes() {
  router = new Router();

  // Home
  router.on('/', () => {
    buildSidebar('home');
    mainEl.innerHTML = mobileHeader('avatar.ai') + renderHomePage();
    attachMobileMenu();
    initHomePage({ onNavigate: navigate });
  });

  // Explore
  router.on('/explore', () => {
    buildSidebar('explore');
    mainEl.innerHTML = mobileHeader('Explore') + renderExplorePage(FIGURES);
    attachMobileMenu();
    initExplorePage({ onSelectFigure: id => navigate(`/chat/${id}`) });
  });

  // Chat — wired to real /anthropic endpoint
  router.on('/chat/:figureId', ({ figureId }) => {
    const figure = FIGURES.find(f => f.id === figureId);
    buildSidebar('');
    mainEl.innerHTML = mobileHeader(figure?.name ?? 'Chat') + renderChatPage(figureId, FIGURES);
    attachMobileMenu();

    const chatHistory = [];

    initChatPage(figureId, FIGURES, {
      onSendMessage: async (text, fig, { onReply, onError }) => {
        chatHistory.push({ role: 'user', content: text });
        try {
          const res = await fetch('/anthropic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-access-code': ACCESS_CODE },
            body: JSON.stringify({
              model: 'claude-sonnet-4-5',
              max_tokens: 1500,
              system: fig.brain ?? `You are ${fig.name}. Respond in character based on documented history.`,
              messages: chatHistory,
            }),
          });
          if (!res.ok) throw new Error(`API error ${res.status}`);
          const data = await res.json();
          const reply = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
          chatHistory.push({ role: 'assistant', content: reply });
          onReply(reply);
        } catch (e) {
          console.error('Chat error:', e);
          onError();
        }
      },
    });
  });

  // Library
  router.on('/library', () => {
    buildSidebar('library');
    mainEl.innerHTML = mobileHeader('Library') + renderLibraryPage();
    attachMobileMenu();
    initLibraryPage({ onSelectFigure: id => navigate(`/chat/${id}`) });
  });

  // Settings
  router.on('/settings', () => {
    buildSidebar('settings');
    mainEl.innerHTML = mobileHeader('Settings') + `
      <div class="settings-page page page-enter">
        <div class="page-title">Settings</div>
        <p style="color:var(--text-secondary);font-size:14px;margin-top:8px;max-width:440px;">
          Account settings, voice preferences, and access management coming soon.
        </p>
      </div>
    `;
    attachMobileMenu();
  });

  // Fallback
  router.on('*', () => navigate('/'));
}

// ─── Boot ─────────────────────────────────
async function boot() {
  if (ACCESS_CODE) {
    // Verify stored code is still valid
    try {
      const res = await fetch('/verify', { method: 'POST', headers: { 'x-access-code': ACCESS_CODE } });
      if (!res.ok) {
        ACCESS_CODE = '';
        sessionStorage.removeItem('access_code');
      }
    } catch {
      // Server unreachable — clear code and show auth
      ACCESS_CODE = '';
      sessionStorage.removeItem('access_code');
    }
  }

  if (!ACCESS_CODE) {
    showAuthOverlay(async () => {
      await loadFigures();
      setupRoutes();
      router.navigate(window.location.hash.replace('#', '') || '/');
    });
    return;
  }

  await loadFigures();
  setupRoutes();
}

boot();

// ─── SVG Icons ────────────────────────────
function iconPlus() {
  return `<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
  </svg>`;
}
function iconSearch() {
  return `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">
    <circle cx="11" cy="11" r="7.5"/>
    <path stroke-linecap="round" d="m20 20-3.5-3.5"/>
  </svg>`;
}
function iconBook() {
  return `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
  </svg>`;
}
function iconSettings() {
  return `<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">
    <circle cx="12" cy="12" r="3"/>
    <path stroke-linecap="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`;
}
