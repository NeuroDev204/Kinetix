#!/usr/bin/env node
// Real-provider smoke check for Kinetix. Does nothing unless KINETIX_REAL_AI=1, because each run
// spends free-tier quota. Checks: one text call to the local model, one vision call to Gemini on
// a 64x64 PNG made in memory. Prints one line per check: `OK <name>` or `FAIL <name> <class>`.
// The live-token check is added with the Live endpoint (Task 3.1).
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';

if (!/^(1|true|yes|on)$/i.test(process.env.KINETIX_REAL_AI || '')) process.exit(0);

const cfg = await import('../coach/config.js');
const { adapterFor } = await import('../coach/adapters/index.js');
const { fetchFor } = await import('../coach/node-fetch.js');
const { classifyFailure } = await import('../coach/core/failure.js');

function png64() {
  const w = 64, h = 64;
  const rows = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { rows[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) rows.set([200, 120, 60], y * (w * 3 + 1) + 1 + x * 3); }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

async function check(name, provider, opts) {
  const adapter = adapterFor(provider);
  if (!adapter) return console.log(`FAIL ${name} off`);
  const resolved = cfg.credentialFor('smoke', provider);
  if (!resolved.ok) return console.log(`FAIL ${name} ${resolved.reason}`);
  const jobDir = adapter.spawns === false ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'kinetix-smoke-'));
  try {
    const r = await adapter.invoke({
      cfg: cfg.load(), prompt: opts.prompt, system: 'Answer briefly.', schema: null, model: cfg.modelFor(cfg.load(), provider),
      timeoutMs: 120000, fetch: fetchFor(120000), maxTokens: 64, jobDir, env: cfg.jobEnv(jobDir || os.tmpdir(), { ...resolved, provider }),
      ...(opts.media ? { media: opts.media } : {}),
    });
    const text = r && typeof r.text === 'string' ? r.text : '';
    if (r && r.code === 0 && text.trim()) console.log(`OK ${name}`);
    else console.log(`FAIL ${name} ${classifyFailure({ text: (r && r.stderr) || text, spawnError: !!(r && r.spawnError) })}`);
  } catch (e) {
    console.log(`FAIL ${name} ${e && e.name === 'AbortError' ? 'timeout' : 'provider'}`);
  } finally {
    if (jobDir) fs.rmSync(jobDir, { recursive: true, force: true });
  }
}

await check('compatible-text', cfg.load().routing?.text || cfg.load().provider, { prompt: 'Say OK.' });
await check('gemini-vision', 'gemini', {
  prompt: 'Describe this image in one word.',
  media: [{ mimeType: 'image/png', data: png64().toString('base64') }],
});
console.log('SKIP live-token (added with Task 3.1)');
