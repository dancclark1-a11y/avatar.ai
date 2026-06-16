# The Storyteller Broadcast

A multi-avatar AI interview platform for podcast use. Historical and cultural figures speak as themselves in an interview format, powered by Claude (Anthropic API) for the "brain," ElevenLabs for voice synthesis and speech-to-text, and a Node.js backend.

## Architecture

- **`server.js`** — Node.js proxy server. Handles Anthropic API calls, ElevenLabs text-to-speech, ElevenLabs speech-to-text (Scribe), and serves the static frontend.
- **`index.html`** — The full frontend platform (dark academic / cinematic aesthetic).

The browser never calls the Anthropic or ElevenLabs APIs directly — everything routes through `server.js`. This is required: direct browser calls to Anthropic hit CORS errors, and the proxy keeps API keys off the client.

## Requirements

- Node.js (built/tested on v24.15.0)
- An Anthropic API key
- An ElevenLabs API key

## Running Locally

1. Open this folder in VS Code.
2. Make sure your API keys are set (see `server.js` for where they're read).
3. In the terminal, from the project root:

   ```
   node server.js
   ```

4. Open Chrome to:

   ```
   http://localhost:3000
   ```

**Important:** Always access the app through `http://localhost:3000`, served by the Node server. Do not open `index.html` directly as a file — API calls will fail.

## Avatars

Eight avatars are built, each with a research-backed system prompt grounded in primary sources.

| Avatar | Source Basis | Voice |
|---|---|---|
| George Washington | Founders Online, Library of Congress | Active |
| Jahseh Onfroy (XXXTentacion) | Lyrics, documented interviews | Active |
| Sigmund Freud | Published works, letters | Active |
| Niccolò Machiavelli | *The Prince*, Vettori letters | Active |
| King David | Psalms, 1–2 Samuel | Active |
| King Solomon | Proverbs, Ecclesiastes, Song of Songs, 1 Kings | Awaiting voice ID |
| Jane Austen | Letters to Cassandra, her novels | Awaiting voice ID |
| Cleopatra VII | — | Awaiting voice ID |

Web search is enabled for every avatar except Cleopatra, allowing live primary-source lookup before a response.

## Roadmap

- Add voice IDs for Solomon, Austen, and Cleopatra to bring them live.
- Activate the talking-head / lip-sync feature once ElevenLabs' Omnihuman API is publicly available (architecture is already in place).
- Continue deepening avatar "brains" with more primary-source material.
