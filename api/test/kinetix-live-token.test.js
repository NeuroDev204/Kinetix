// The live token endpoint: one single-use token per session, the key never in the answer, and the
// usual refusals (signed out, no consent, no live route, quota).
import test from 'node:test';
import assert from 'node:assert/strict';
import { tempData } from './helpers.mjs';
import { mintLiveToken, kinetixRoutes } from '../kinetix/live-token.js';

tempData();

test('the minted token is single-use and bound to the model', async () => {
  let cfg;
  const genai = o => { cfg = o; return { authTokens: { create: async args => { cfg.args = args; return { name: 'tok-1' }; } } }; };
  const r = await mintLiveToken({ apiKey: 'KEY', model: 'gemini-3.8-live', now: () => 1000, genai });
  assert.equal(r.token, 'tok-1');
  assert.equal(cfg.apiKey, 'KEY');
  assert.equal(cfg.httpOptions.apiVersion, 'v1beta');
  assert.equal(cfg.args.config.uses, 1);
  assert.equal(cfg.args.config.liveConnectConstraints.model, 'gemini-3.8-live');
});

function harness({ user = { id: 'u1' }, consent = true, routing = { live: 'gemini', liveModel: 'gemini-3.8-live' }, cred = { ok: true, auth: { token: 'SECRET-KEY' } }, genai } = {}) {
  const out = {};
  const routes = kinetixRoutes({
    json: (res, status, body) => { out.status = status; out.body = body; },
    readBody: async () => ({}),
    readSession: () => user,
    cfgStore: { load: () => ({ routing }) },
    credentialFor: () => cred,
    consented: () => consent,
    genai,
  });
  return { call: () => routes['POST /api/kinetix/live-token']({}, {}).then(() => out), out };
}

test('signed out is 401, without consent is 403', async () => {
  assert.equal((await harness({ user: null }).call()).status, 401);
  assert.equal((await harness({ consent: false }).call()).status, 403);
});

test('no live route is 503', async () => {
  assert.equal((await harness({ routing: null }).call()).status, 503);
});

test('a quota error from the provider is 429 quota', async () => {
  const genai = () => ({ authTokens: { create: async () => { throw Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 }); } } });
  const r = await harness({ genai }).call();
  assert.equal(r.status, 429);
  assert.equal(r.body.error, 'quota');
});

test('the answer carries the token and the socket address, never the key', async () => {
  const genai = () => ({ authTokens: { create: async () => ({ name: 'tok-9' }) } });
  const r = await harness({ genai }).call();
  assert.equal(r.status, 200);
  assert.equal(r.body.token, 'tok-9');
  assert.match(r.body.wsUrl, /^wss:\/\//);
  assert.ok(!JSON.stringify(r.body).includes('SECRET-KEY'));
});
