// Kinetix routing: a profile's credential can be read for a provider other than the one selected,
// so a Gemini key filed while Qwen (compatible) is the text provider still reaches the vision jobs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tempData } from './helpers.mjs';

tempData();
const cfg = await import('../coach/config.js');

test('credentialFor reads the named provider, not only the selected one', () => {
  cfg.save({ enabled: true, provider: 'compatible', authMode: 'instance', boundUid: {},
    auth: { gemini: { type: 'apikey', account: null, data: cfg.encrypt({ token: 'g-key' }) } } });
  const r = cfg.credentialFor('alice', 'gemini');
  assert.equal(r.ok, true);
  assert.equal(r.auth.token, 'g-key');
});

test('routing round-trips through save and load', () => {
  const routing = { text: 'compatible', vision: 'gemini', fallback: 'gemini', live: 'gemini',
    liveModel: 'gemini-3.8-live', ctx: 8192, textTimeoutMs: 180000 };
  cfg.save({ routing });
  cfg.reset();
  assert.deepEqual(cfg.load().routing, routing);
});

test('without routing, credentialFor(uid) behaves as before', () => {
  cfg.save({ provider: 'fixture', routing: undefined });
  cfg.reset();
  const r = cfg.credentialFor('alice');
  assert.equal(r.ok, true);
  assert.equal(cfg.load().routing, undefined);
});

test('jobEnv injects the key of the provider it was resolved for', () => {
  cfg.save({ provider: 'compatible' });
  const env = cfg.jobEnv('/tmp/job-x', { provider: 'gemini', type: 'apikey', auth: { token: 'g-key' } });
  assert.equal(env.GEMINI_API_KEY, 'g-key');
});
