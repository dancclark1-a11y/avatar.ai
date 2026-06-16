# CLAUDE.md

Context and working rules for Claude Code on this project. Read this before making changes.

## What this project is

The Storyteller Broadcast — a multi-avatar AI interview platform for podcast use. Historical/cultural figures speak as themselves in interview format. Claude (Anthropic API) is the brain, ElevenLabs does voice + speech-to-text, and a Node.js server ties it together.

## Files

- `server.js` — Node proxy. Handles all Anthropic API calls, ElevenLabs TTS, ElevenLabs STT (Scribe), and serves static files. **All external API calls go through here, never from the browser.**
- `index.html` — frontend platform UI.

## Run command

```
node server.js
```

Then open `http://localhost:3000` in the browser. The HTML must be served by the Node server, not opened as a file.

## Hard constraints — do not break these

- **Never call the Anthropic or ElevenLabs API directly from the browser.** Direct browser calls to Anthropic fail with CORS errors. Everything routes through `server.js`.
- **Never put API keys in `index.html` or any client-side code.** Keys live server-side only.
- **Never fabricate avatar content.** Avatar responses must come from documented primary sources. If the sources aren't clear on something, the avatar should say so rather than invent.

## Avatar brains

Each avatar has a research-backed system prompt grounded in primary sources (e.g. Washington from Founders Online and the Library of Congress; Freud from his published works and letters; David from the Psalms and 1–2 Samuel). Web search (`web_search_20250305`) is enabled for all avatars except Cleopatra.

A universal `BASE_RULES` constant is appended to every avatar's system prompt. When editing avatar behavior, prefer changing `BASE_RULES` for anything that should apply to all avatars; edit an individual avatar's prompt only for that avatar's specific voice/register.

## Style rules (these are intentional — preserve them)

- Conversational tone, not academic analysis.
- Natural contractions; genuine variation in response length (not uniformly medium answers).
- No poetic, elevated, or "AI-sounding" cadence.
- Quotes are dropped in as the point itself, not as a conclusion built up to. Pattern: "I once said..." then the quote.
- Facts over inference. Never make something up; if sources are unclear, say so.
- No repetition across conversation turns.
- Each avatar has its own speaking register: Washington plain/direct, Freud dry/clinical, Machiavelli blunt, David emotional/immediate, Solomon measured/weary, Austen witty/economical, Jahseh raw/unfiltered.

## Current state

- Active voices: Washington, Jahseh, Freud, Machiavelli, King David.
- Built but awaiting voice IDs: Solomon, Austen, Cleopatra.
- Talking-head / lip-sync is architected but inactive — waiting on ElevenLabs' Omnihuman public API.
- In progress: deepening Washington's brain with more primary-source quotes.

## Working preferences

- This is a solo project; the owner is newer to development. Explain changes in plain terms and avoid unexplained jargon.
- When changing a voice ID or avatar-specific value, make sure the edit lands in the correct avatar's entry and doesn't affect others.
