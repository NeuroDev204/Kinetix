// Kinetix routing in the job runner: text jobs go to the local model, vision jobs to Gemini, one
// fallback on a failure a second model can fix. Provider calls are stubbed on the adapter objects
// (the same pattern jobs.test.js uses); nothing here reaches a real model.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempData, writeState, sampleState } from './helpers.mjs';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), '../coach/fixture-cli.mjs');
// A provider that answers like the fixture CLI: a valid answer for the prompt it is given.
const goodAnswer = async opts => {
  const r = spawnSync(process.execPath, [FIXTURE], { input: opts.prompt, encoding: 'utf8' });
  return { code: r.status, text: r.stdout, stderr: r.stderr };
};

const DIR = tempData();
const cfg = await import('../coach/config.js');
const jobs = await import('../coach/jobs.js');
const { adapterFor } = await import('../coach/adapters/index.js');
const { forcePrivilegeVerdict } = await import('../coach/adapters/spawn.js');
forcePrivilegeVerdict({ ok: true, dropped: false, why: 'pinned by the test suite' });

const compatible = adapterFor('compatible');
const gemini = adapterFor('gemini');
const saved = { compatible: { check: compatible.check, invoke: compatible.invoke }, gemini: { check: gemini.check, invoke: gemini.invoke } };

async function settle(uid, ms = 15000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (!jobs.status(uid).job) return;
    await new Promise(r => setTimeout(r, 25));
  }
  throw new Error('job never finished');
}

function routed(textTimeoutMs = 50) {
  cfg.save({
    enabled: true, provider: 'compatible', authMode: 'instance', boundUid: {},
    routing: { text: 'compatible', vision: 'gemini', fallback: 'gemini', live: 'gemini', liveModel: 'gemini-3.8-live', ctx: 8192, textTimeoutMs },
    auth: {
      compatible: { type: 'apikey', account: null, data: cfg.encrypt({ token: 'c-key' }) },
      gemini: { type: 'apikey', account: null, data: cfg.encrypt({ token: 'g-key' }) },
    },
    models: { compatible: 'qwen3.5:4b', gemini: 'gemini-3.8-flash' },
  });
}

function stub(adapter, fn) {
  adapter.check = async () => ({ ok: true, version: 'stub' });
  adapter.invoke = fn;
}

test.after(() => {
  Object.assign(compatible, saved.compatible);
  Object.assign(gemini, saved.gemini);
  cfg.save({ provider: 'fixture', routing: undefined });
  forcePrivilegeVerdict({ ok: true, dropped: false, why: 'pinned by the test suite' });
});

test('a text job on the local model records its provider and no fallback', async () => {
  const uid = 'u-route-text';
  writeState(DIR, uid, sampleState());
  routed();
  let calls = 0;
  stub(compatible, async opts => { calls++; return goodAnswer(opts); });
  stub(compatible, async opts => { calls++; return goodAnswer(opts); });
  let geminiCalls = 0;
  stub(gemini, async () => { geminiCalls++; return { code: 1, text: '', stderr: 'should not run' }; });
  jobs.enqueue(uid, { kind: 'review' });
  await settle(uid);
  const last = jobs.readUser(uid).history.at(-1);
  assert.equal(calls >= 1, true);
  assert.equal(geminiCalls, 0);
  assert.equal(last.outcome, 'ready');
  assert.equal(last.provider, 'compatible');
  assert.equal(last.fellBack, false);
});

test('an unusable local answer falls back to Gemini once', async () => {
  const uid = 'u-route-fallback';
  writeState(DIR, uid, sampleState());
  routed();
  let geminiCalls = 0;
  stub(compatible, async () => ({ code: 0, text: 'not json', stderr: '' }));
  stub(gemini, async opts => { geminiCalls++; return goodAnswer(opts); });
  jobs.enqueue(uid, { kind: 'review' });
  await settle(uid);
  const last = jobs.readUser(uid).history.at(-1);
  assert.equal(geminiCalls, 1);
  assert.equal(last.outcome, 'ready');
  assert.equal(last.provider, 'gemini');
  assert.equal(last.fellBack, true);
});

test('a local model that never answers is abandoned at textTimeoutMs for Gemini', async () => {
  const uid = 'u-route-timeout';
  writeState(DIR, uid, sampleState());
  routed(50);
  stub(compatible, (opts) => new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), opts.timeoutMs)));
  let geminiCalls = 0;
  stub(gemini, async opts => { geminiCalls++; return goodAnswer(opts); });
  const t0 = Date.now();
  jobs.enqueue(uid, { kind: 'review' });
  await settle(uid);
  assert.equal(geminiCalls, 1);
  assert.ok(Date.now() - t0 < 10000, 'did not wait for the job budget');
  const last = jobs.readUser(uid).history.at(-1);
  assert.equal(last.fellBack, true);
});

test('a Gemini quota error on a vision job fails once, with no second attempt', async () => {
  const uid = 'u-route-quota';
  writeState(DIR, uid, sampleState());
  routed();
  let geminiCalls = 0;
  stub(gemini, async () => { geminiCalls++; return { code: 1, text: '', stderr: '429 quota exceeded' }; });
  jobs.enqueue(uid, { kind: 'physique', media: { hash: 'a'.repeat(64), mime: 'image/jpeg' } });
  await settle(uid);
  assert.equal(geminiCalls, 1);
  const last = jobs.readUser(uid).history.at(-1);
  assert.equal(last.outcome, 'failed');
  assert.equal(last.errorClass, 'quota');
});
