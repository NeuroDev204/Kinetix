// The physique job: the answer is checked before it is kept, the payload carries the facts and
// never the photo or a catalogue path, and a photo the store does not hold is refused up front.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePhysique } from '../coach/core/validate.js';
import { cleanPhysiqueBody, buildPhysique, cleanMediaRef } from '../coach/core/physique.js';
import { taskOf, buildPromptParts } from '../coach/core/prompt.js';
import { SCHEMAS } from '../coach/core/schemas.js';
import { SERVER_PHOTO_CATEGORY } from '../coach/core/categories.js';

const good = { coach_contract: 1, physique: { bodyFatRange: [12, 16], notes: 'Lean through the chest.', focusAreas: ['core', 'back'] } };

test('a valid physique answer is kept with its contract and range', () => {
  const r = validatePhysique(good);
  assert.equal(r.ok, true);
  assert.equal(r.proposal.coach_contract, 1);
  assert.deepEqual(r.proposal.physique.bodyFatRange, [12, 16]);
});

test('a range that is backwards or outside 3-60 is refused', () => {
  assert.equal(validatePhysique({ ...good, physique: { ...good.physique, bodyFatRange: [40, 20] } }).ok, false);
  assert.equal(validatePhysique({ ...good, physique: { ...good.physique, bodyFatRange: [1, 70] } }).ok, false);
});

test('too many focus areas, or notes too long, are refused', () => {
  assert.equal(validatePhysique({ ...good, physique: { ...good.physique, focusAreas: ['a', 'b', 'c', 'd', 'e', 'f'] } }).ok, false);
  assert.equal(validatePhysique({ ...good, physique: { ...good.physique, notes: 'x'.repeat(601) } }).ok, false);
});

test('the physique task has its own prompt and schema', () => {
  assert.equal(taskOf('physique', {}), 'physique');
  assert.ok(SCHEMAS.physique);
  assert.match(buildPromptParts('physique', buildPhysique({ handle: 'h', body: {} }), null).system, /body/i);
});

test('the payload carries the facts and the day, and no photo or catalogue path', () => {
  const body = cleanPhysiqueBody({ sex: 'm', age: 25, heightCm: 175, weightKg: 70, goalKg: 65 });
  assert.equal(body.ok, true);
  const p = buildPhysique({ handle: 'h1', lang: 'vi', body: body.body, now: Date.UTC(2026, 10, 24, 5) });
  const text = JSON.stringify(p) + buildPromptParts('physique', p, null).user;
  assert.equal(p.body.heightCm, 175);
  assert.ok(!text.includes('catalogue'));
  assert.ok(!text.includes('hash'));
});

test('bad facts and bad photo refs are refused', () => {
  assert.equal(cleanPhysiqueBody({ sex: 'x', age: 25, heightCm: 175, weightKg: 70, goalKg: 65 }).ok, false);
  assert.equal(cleanPhysiqueBody({ sex: 'm', age: 5, heightCm: 175, weightKg: 70, goalKg: 65 }).ok, false);
  assert.equal(cleanMediaRef({ hash: '../../catalogue/media/still/0001.webp' }), null);
  assert.deepEqual(cleanMediaRef({ hash: 'a'.repeat(64), mime: 'image/jpeg' }), { hash: 'a'.repeat(64), mime: 'image/jpeg' });
});

test('the disclosure names the photo category', () => {
  assert.equal(SERVER_PHOTO_CATEGORY, 'media');
});

/* Through the queue and the real fixture provider, and through the route. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tempData, writeState, sampleState } from './helpers.mjs';
import { forcePrivilegeVerdict } from '../coach/adapters/spawn.js';

const DIR = tempData();
const cfg = await import('../coach/config.js');
const jobs = await import('../coach/jobs.js');
const { coachRoutes } = await import('../coach/routes.js');
forcePrivilegeVerdict({ ok: true, dropped: false, why: 'pinned by the test suite' });
cfg.save({ enabled: true, provider: 'fixture' });

const HASH = 'e'.repeat(64);
const photo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kinetix-phys-')), `${HASH}.jpg`);
fs.writeFileSync(photo, Buffer.from('jpeg'));
jobs.setMediaFile((uid, hash) => (uid === 'u-phys' && hash === HASH ? { path: photo, ext: 'jpg', mime: 'image/jpeg', size: 4 } : null));

async function settle(uid, ms = 15000) {
  const until = Date.now() + ms;
  while (Date.now() < until) { if (!jobs.status(uid).job) return; await new Promise(r => setTimeout(r, 25)); }
  throw new Error('job never finished');
}

test('a physique job on the fixture provider is kept as a physique proposal', async () => {
  writeState(DIR, 'u-phys', sampleState());
  jobs.enqueue('u-phys', { kind: 'physique', media: { hash: HASH, mime: 'image/jpeg' }, body: { sex: 'm', age: 25, heightCm: 175, weightKg: 70, goalKg: 65 } });
  await settle('u-phys');
  const last = jobs.readUser('u-phys').history.at(-1);
  assert.equal(last.outcome, 'ready');
  const pending = jobs.readUser('u-phys').pending;
  assert.deepEqual(pending.physique.bodyFatRange, [12, 16]);
});

test('the route answers 202 with the job id for a photo the store holds, and 409 media-missing otherwise', async () => {
  const sent = [];
  const routes = coachRoutes({
    json: (res, status, body) => sent.push({ status, body }),
    readBody: async () => ({ media: { hash: HASH, mime: 'image/jpeg' }, body: { sex: 'm', age: 25, heightCm: 175, weightKg: 70, goalKg: 65 } }),
    readSession: () => ({ id: 'u-phys' }),
    requireAdmin: () => true,
  });
  const handler = routes['POST /api/coach/physique'];
  await handler({ headers: {} }, {});
  assert.equal(sent.at(-1).status, 202);
  assert.ok(sent.at(-1).body.id);
  await settle('u-phys');

  const missing = coachRoutes({
    json: (res, status, body) => sent.push({ status, body }),
    readBody: async () => ({ media: { hash: 'f'.repeat(64), mime: 'image/jpeg' }, body: { sex: 'm', age: 25, heightCm: 175, weightKg: 70, goalKg: 65 } }),
    readSession: () => ({ id: 'u-phys' }),
    requireAdmin: () => true,
  })['POST /api/coach/physique'];
  await missing({ headers: {} }, {});
  assert.deepEqual(sent.at(-1), { status: 409, body: { error: 'media-missing' } });
});
