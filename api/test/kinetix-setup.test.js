// The setup script is run twice on the same data folder; the second run must change nothing, and
// the key must never reach stdout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempData } from './helpers.mjs';

const dir = tempData();
const API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, DATA_DIR: dir, GEMINI_API_KEY: 'test-key', OLLAMA_BASE: 'http://127.0.0.1:9999' };
const run = () => execFileSync(process.execPath, [path.join(API, 'scripts/kinetix-setup.mjs')], { env, cwd: API, encoding: 'utf8' });

test('setup writes the Kinetix routing and the Gemini key, twice, and never prints the key', async () => {
  const out1 = run();
  const out2 = run();
  assert.ok(!out1.includes('test-key') && !out2.includes('test-key'), 'key must not be printed');
  const cfg = await import('../coach/config.js');
  cfg.reset();
  const c = cfg.load();
  assert.equal(c.routing.text, 'compatible');
  assert.equal(c.routing.vision, 'gemini');
  assert.equal(c.models.compatible, 'qwen3.5:4b');
  assert.equal(c.providerOptions.compatible.baseUrl, 'http://127.0.0.1:9999');
  const uid = 'someone';
  assert.equal(cfg.credentialFor(uid, 'gemini').auth.token, 'test-key');
});
