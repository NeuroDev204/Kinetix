#!/usr/bin/env node
// Writes the Kinetix AI routing into coach.json: Qwen (on Ollama) for text, Gemini for vision.
// Idempotent. Reads DATA_DIR, GEMINI_API_KEY and OLLAMA_BASE from the environment and never prints
// the key. Run it with the same DATA_DIR the server uses.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// The same secret server.js makes at boot, so the encrypted credential can be written before the first start.
const DATA = process.env.DATA_DIR || '/data';
fs.mkdirSync(DATA, { recursive: true });
if (!fs.existsSync(path.join(DATA, 'secret'))) fs.writeFileSync(path.join(DATA, 'secret'), crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
const cfg = await import('../coach/config.js');
const { encrypt } = cfg;

const key = process.env.GEMINI_API_KEY || '';
const ollama = process.env.OLLAMA_BASE || 'http://host.docker.internal:11434';

cfg.save({
  enabled: true,
  provider: 'compatible',
  models: { compatible: 'qwen3.5:4b', gemini: 'gemini-3.8-flash' },
  providerOptions: { compatible: { baseUrl: ollama } },
  routing: { text: 'compatible', vision: 'gemini', fallback: 'gemini', live: 'gemini', liveModel: 'gemini-3.8-live', ctx: 8192, textTimeoutMs: 180000 },
});
if (key) cfg.saveAuth('gemini', { type: 'apikey', account: null, data: encrypt({ token: key }), connectedAt: Date.now() });
console.log(`kinetix setup: routing text=compatible vision=gemini; gemini key ${key ? 'stored' : 'NOT SET (set GEMINI_API_KEY)'}; ollama ${ollama}`);
