// The meal job: a dish list with grams and macros, or an empty list that says why. The photo is
// read on the server; the payload carries no photo, no hash and no catalogue path.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateMeal } from '../coach/core/validate.js';
import { buildMeal } from '../coach/core/physique.js';
import { buildPromptParts } from '../coach/core/prompt.js';
import { tempData, writeState, sampleState } from './helpers.mjs';
import { forcePrivilegeVerdict } from '../coach/adapters/spawn.js';

const dish = { name: 'cơm tấm', grams: 300, kcal: 500, protein: 20, carbs: 70, fat: 15 };

test('a dish list is kept as is', () => {
  const r = validateMeal({ coach_contract: 1, items: [dish] });
  assert.equal(r.ok, true);
  assert.equal(r.proposal.items[0].name, 'cơm tấm');
});

test('an empty list is accepted only with a note', () => {
  assert.equal(validateMeal({ coach_contract: 1, items: [], note: 'No food found in this photo.' }).ok, true);
  assert.equal(validateMeal({ coach_contract: 1, items: [] }).ok, false);
  assert.equal(validateMeal({ coach_contract: 1, items: [], note: '   ' }).ok, false);
});

test('out-of-range dishes are refused', () => {
  assert.equal(validateMeal({ coach_contract: 1, items: [{ ...dish, grams: 3001 }] }).ok, false);
  assert.equal(validateMeal({ coach_contract: 1, items: [{ ...dish, grams: 0 }] }).ok, false);
  assert.equal(validateMeal({ coach_contract: 1, items: [{ ...dish, kcal: 4001 }] }).ok, false);
  assert.equal(validateMeal({ coach_contract: 1, items: [{ ...dish, fat: 501 }] }).ok, false);
  assert.equal(validateMeal({ coach_contract: 1, items: [{ ...dish, name: 'x'.repeat(81) }] }).ok, false);
  assert.equal(validateMeal({ coach_contract: 1, items: Array.from({ length: 13 }, () => dish) }).ok, false);
});

test('the meal payload and prompt carry no photo, hash or catalogue path', () => {
  const p = buildMeal({ handle: 'h1', lang: 'vi', now: Date.UTC(2026, 10, 24, 5) });
  const text = JSON.stringify(p) + buildPromptParts('meal', p, null).user;
  assert.equal(p.task, 'meal');
  assert.ok(!text.includes('catalogue'));
  assert.ok(!/[0-9a-f]{64}/.test(text));
});

const DIR = tempData();
const cfg = await import('../coach/config.js');
const jobs = await import('../coach/jobs.js');
const { coachRoutes } = await import('../coach/routes.js');
forcePrivilegeVerdict({ ok: true, dropped: false, why: 'pinned by the test suite' });
cfg.save({ enabled: true, provider: 'fixture' });
const HASH = 'f'.repeat(64);
const photo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kinetix-meal-')), `${HASH}.jpg`);
fs.writeFileSync(photo, Buffer.from('jpeg'));
jobs.setMediaFile((uid, hash) => (uid === 'u-meal' && hash === HASH ? { path: photo, ext: 'jpg', mime: 'image/jpeg', size: 4 } : null));

async function settle(uid, ms = 15000) {
  const until = Date.now() + ms;
  while (Date.now() < until) { if (!jobs.status(uid).job) return; await new Promise(r => setTimeout(r, 25)); }
  throw new Error('job never finished');
}

test('a meal job on the fixture provider is kept as dishes', async () => {
  writeState(DIR, 'u-meal', sampleState());
  jobs.enqueue('u-meal', { kind: 'meal', media: { hash: HASH, mime: 'image/jpeg' } });
  await settle('u-meal');
  assert.equal(jobs.readUser('u-meal').history.at(-1).outcome, 'ready');
  assert.equal(jobs.readUser('u-meal').pending.items[0].name, 'Fixture rice');
});

test('the route answers 409 while the photo is not on the server, and 202 once it is', async () => {
  const sent = [];
  const mk = hash => coachRoutes({
    json: (res, status, body) => sent.push({ status, body }),
    readBody: async () => ({ media: { hash, mime: 'image/jpeg' } }),
    readSession: () => ({ id: 'u-meal' }),
    requireAdmin: () => true,
  })['POST /api/coach/meal'];
  await mk('0'.repeat(64))({ headers: {} }, {});
  assert.deepEqual(sent.at(-1), { status: 409, body: { error: 'media-missing' } });
  await mk(HASH)({ headers: {} }, {});
  assert.equal(sent.at(-1).status, 202);
  await settle('u-meal');
});
