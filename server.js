const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env file
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    .split('\n').forEach(line => {
      const eq = line.indexOf('=');
      if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    });
} catch(e) {}

const PORT = process.env.PORT || 3000;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || '';
const ELEVEN_KEY = process.env.ELEVEN_KEY || '';
const ACCESS_CODE = process.env.ACCESS_CODE || '';
const BEEHIIV_KEY = process.env.BEEHIIV_KEY || '';
const BEEHIIV_PUB_ID = process.env.BEEHIIV_PUB_ID || '';

if (!ACCESS_CODE) {
  console.error('\n❌  ACCESS_CODE is not set in .env — server will reject all requests.\n');
}

function authorized(req) {
  return ACCESS_CODE && req.headers['x-access-code'] === ACCESS_CODE;
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── Access code verification ──────────────────────────────────────
  if (req.method === 'POST' && req.url === '/verify') {
    const code = req.headers['x-access-code'];
    if (ACCESS_CODE && code === ACCESS_CODE) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, hasEleven: !!ELEVEN_KEY }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
    }
    return;
  }

  // ── Beehiiv subscribe ─────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/subscribe') {
    const body = await readBody(req);
    let email;
    try { email = JSON.parse(body.toString()).email; } catch(e) {}
    if (!email) { res.writeHead(400); res.end(JSON.stringify({ ok: false })); return; }

    // Always save locally as backup
    const wlPath = path.join(__dirname, 'waitlist.json');
    let list = [];
    try { list = JSON.parse(fs.readFileSync(wlPath, 'utf8')); } catch(e) {}
    if (!list.find(e => e.email === email)) list.push({ email, ts: new Date().toISOString() });
    fs.writeFileSync(wlPath, JSON.stringify(list, null, 2));

    // Forward to Beehiiv if keys are set
    if (BEEHIIV_KEY && BEEHIIV_PUB_ID) {
      const payload = JSON.stringify({ email, send_welcome_email: true, utm_source: 'avatar-ai-site' });
      const opts = {
        hostname: 'api.beehiiv.com',
        path: `/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BEEHIIV_KEY}`, 'Content-Length': Buffer.byteLength(payload) }
      };
      await new Promise(resolve => {
        const r = https.request(opts, bRes => { bRes.resume(); bRes.on('end', resolve); });
        r.on('error', e => { console.error('Beehiiv error:', e.message); resolve(); });
        r.write(payload); r.end();
      });
    } else {
      console.log('Beehiiv keys not set — email saved locally only:', email);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── Waitlist ─────────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/waitlist') {
    const body = await readBody(req);
    let entry;
    try { entry = JSON.parse(body.toString()); } catch(e) { res.writeHead(400); res.end(JSON.stringify({ ok: false })); return; }
    const wlPath = path.join(__dirname, 'waitlist.json');
    let list = [];
    try { list = JSON.parse(fs.readFileSync(wlPath, 'utf8')); } catch(e) {}
    list.push({ ...entry, ts: new Date().toISOString() });
    fs.writeFileSync(wlPath, JSON.stringify(list, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── Avatar list ──────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/avatars') {
    if (!authorized(req)) { res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
    try {
      const avatarsDir = path.join(__dirname, 'avatars');
      const base = fs.readFileSync(path.join(avatarsDir, '_base.txt'), 'utf8');
      const avatars = fs.readdirSync(avatarsDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const meta = JSON.parse(fs.readFileSync(path.join(avatarsDir, f), 'utf8'));
          const brainPath = path.join(avatarsDir, f.replace('.json', '.txt'));
          meta.brain = (fs.existsSync(brainPath) ? fs.readFileSync(brainPath, 'utf8') : '') + '\n\n' + base;
          return meta;
        })
        .sort((a, b) => (a.order || 99) - (b.order || 99));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(avatars));
    } catch(e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── Anthropic proxy ──────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/anthropic') {
    if (!authorized(req)) { res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
    const body = await readBody(req);
    const parsed = JSON.parse(body.toString());
    delete parsed.apiKey;
    const payload = JSON.stringify(parsed);
    console.log('Anthropic call | model:', parsed.model);
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const proxyReq = https.request(options, proxyRes => {
      let data = '';
      proxyRes.on('data', c => data += c);
      proxyRes.on('end', () => {
        console.log('Anthropic status:', proxyRes.statusCode);
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });
    proxyReq.on('error', e => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); });
    proxyReq.write(payload);
    proxyReq.end();
    return;
  }

  // ── ElevenLabs TTS + Lip Sync (combined) ─────────────────────────
  if (req.method === 'POST' && req.url.startsWith('/elevenlabs/speak/')) {
    if (!authorized(req)) { res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
    const voiceId = req.url.replace('/elevenlabs/speak/', '');
    const body = await readBody(req);
    const parsed = JSON.parse(body.toString());
    const { text, imageFile, model_id, voice_settings } = parsed;

    console.log('TTS + LipSync | voice:', voiceId, '| image:', imageFile);

    // Step 1: Generate audio from ElevenLabs TTS
    let audioBuffer;
    try {
      const ttsPayload = JSON.stringify({
        text,
        model_id: model_id || 'eleven_flash_v2_5',
        voice_settings: voice_settings || { stability: 0.72, similarity_boost: 0.85 }
      });

      audioBuffer = await new Promise((resolve, reject) => {
        const opts = {
          hostname: 'api.elevenlabs.io',
          path: `/v1/text-to-speech/${voiceId}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVEN_KEY,
            'Content-Length': Buffer.byteLength(ttsPayload)
          }
        };
        const chunks = [];
        const r = https.request(opts, ttsRes => {
          console.log('TTS status:', ttsRes.statusCode);
          ttsRes.on('data', c => chunks.push(c));
          ttsRes.on('end', () => {
            if (ttsRes.statusCode !== 200) {
              reject(new Error('TTS failed: ' + Buffer.concat(chunks).toString()));
            } else {
              resolve(Buffer.concat(chunks));
            }
          });
        });
        r.on('error', reject);
        r.write(ttsPayload);
        r.end();
      });
    } catch(e) {
      console.error('TTS error:', e.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'TTS failed: ' + e.message }));
      return;
    }

    // Step 2: Read the avatar image from disk
    let imageBuffer;
    const imagePath = path.join(__dirname, imageFile);
    try {
      imageBuffer = fs.readFileSync(imagePath);
    } catch(e) {
      console.error('Image read error:', e.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Could not read image: ' + imageFile }));
      return;
    }

    // Step 3: Build multipart form for lip sync
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const ext = path.extname(imageFile).slice(1) || 'jpg';
    const imgMime = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formParts = [];
    formParts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="audio.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n`
    ));
    formParts.push(audioBuffer);
    formParts.push(Buffer.from('\r\n'));
    formParts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${imageFile}"\r\nContent-Type: ${imgMime}\r\n\r\n`
    ));
    formParts.push(imageBuffer);
    formParts.push(Buffer.from('\r\n'));
    formParts.push(Buffer.from(`--${boundary}--\r\n`));

    const formBuffer = Buffer.concat(formParts);

    // Step 4: Call ElevenLabs lip sync endpoint
    try {
      await new Promise((resolve, reject) => {
        const opts = {
          hostname: 'api.elevenlabs.io',
          path: '/v1/video/lip-sync',
          method: 'POST',
          headers: {
            'xi-api-key': ELEVEN_KEY,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': formBuffer.length
          }
        };

        const r = https.request(opts, lipRes => {
          console.log('LipSync status:', lipRes.statusCode);
          const chunks = [];
          lipRes.on('data', c => chunks.push(c));
          lipRes.on('end', () => {
            const result = Buffer.concat(chunks);
            if (lipRes.statusCode !== 200) {
              console.error('LipSync error:', result.toString().slice(0, 300));
              reject(new Error('LipSync failed: ' + lipRes.statusCode));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'video/mp4' });
            res.end(result);
            resolve();
          });
        });
        r.on('error', reject);
        r.write(formBuffer);
        r.end();
      });
    } catch(e) {
      console.error('LipSync error:', e.message, '— falling back to audio only');
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
      res.end(audioBuffer);
    }
    return;
  }

  // ── ElevenLabs TTS only ───────────────────────────────────────────
  if (req.method === 'POST' && req.url.startsWith('/elevenlabs/tts/')) {
    if (!authorized(req)) { res.writeHead(401); res.end(); return; }
    const voiceId = req.url.replace('/elevenlabs/tts/', '');
    const body = await readBody(req);
    const parsed = JSON.parse(body.toString());
    delete parsed.apiKey;
    const payload = JSON.stringify(parsed);
    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const proxyReq = https.request(options, proxyRes => {
      console.log('TTS-only status:', proxyRes.statusCode);
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'audio/mpeg' });
      proxyRes.pipe(res);
    });
    proxyReq.on('error', e => { res.writeHead(500); res.end(); });
    proxyReq.write(payload);
    proxyReq.end();
    return;
  }

  // ── ElevenLabs STT proxy ──────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/elevenlabs/stt') {
    if (!authorized(req)) { res.writeHead(401); res.end(); return; }
    const body = await readBody(req);
    const options = {
      hostname: 'api.elevenlabs.io',
      path: '/v1/speech-to-text',
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': req.headers['content-type'],
        'Content-Length': body.length
      }
    };
    const proxyReq = https.request(options, proxyRes => {
      let data = '';
      proxyRes.on('data', c => data += c);
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });
    proxyReq.on('error', e => { res.writeHead(500); res.end(); });
    proxyReq.write(body);
    proxyReq.end();
    return;
  }

  // ── Static files ──────────────────────────────────────────────────
  const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const mime = {
      '.html': 'text/html', '.js': 'application/javascript',
      '.css': 'text/css', '.jpg': 'image/jpeg',
      '.png': 'image/png', '.webp': 'image/webp'
    };
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎙  THE STORYTELLER BROADCAST`);
  console.log(`✅  Server running at http://localhost:${PORT}`);
  console.log(`    Open http://localhost:${PORT} in Chrome\n`);
});
