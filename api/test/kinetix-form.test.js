// The form job: the review is checked before it is kept (score 1-10, at most five issues), the
// payload names the exercise and carries the pose summary but no video or catalogue path, and a video
// the store does not hold is refused up front.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateForm } from '../coach/core/validate.js';
import { buildForm, cleanVideoRef } from '../coach/core/physique.js';
import { buildPromptParts } from '../coach/core/prompt.js';

const ok = { coach_contract: 1, summary: 'Steady.', issues: [{ rep: 3, issue: 'Heels lift.', cue: 'Keep heels down.' }], score: 7 };

test('a valid form review is kept', () => {
  const r = validateForm(ok);
  assert.equal(r.ok, true);
  assert.equal(r.proposal.score, 7);
  assert.equal(r.proposal.issues[0].rep, 3);
});

test('a score outside 1-10 is refused', () => {
  assert.equal(validateForm({ ...ok, score: 11 }).ok, false);
  assert.equal(validateForm({ ...ok, score: 0 }).ok, false);
});

test('more than five issues is refused', () => {
  const issues = Array.from({ length: 6 }, () => ({ rep: 1, issue: 'x', cue: 'y' }));
  assert.equal(validateForm({ ...ok, issues }).ok, false);
});

test('the payload names the exercise and the set, carries the pose summary, and no video or catalogue path', () => {
  const p = buildForm({
    handle: 'h1', lang: 'en', now: Date.UTC(2026, 10, 24, 5),
    exercise: { id: '3593', name: 'barbell squat' }, set: { w: 80, r: 5 },
    pose: { reps: 5, perRep: [{ minDeg: 80, maxDeg: 170, durationMs: 2000 }], trunkLeanMaxDeg: 30 },
  });
  const text = JSON.stringify(p) + buildPromptParts('form', p, null).user;
  assert.equal(p.exercise.name, 'barbell squat');
  assert.equal(p.pose.reps, 5);
  assert.ok(!text.includes('catalogue'));
  assert.ok(!/[0-9a-f]{64}/.test(text));
  assert.match(buildPromptParts('form', p, null).system, /pose/i);
});

test('a video ref must be a store hash and a video type', () => {
  assert.equal(cleanVideoRef({ hash: '../../catalogue/media/x.mp4', mime: 'video/mp4' }), null);
  assert.deepEqual(cleanVideoRef({ hash: 'a'.repeat(64), mime: 'video/quicktime' }), { hash: 'a'.repeat(64), mime: 'video/quicktime' });
});

/* The route: a set video the store does not hold is 409, one it holds is 202. */
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
const VID = 'd'.repeat(64);
const clip = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kinetix-form-')), `${VID}.mp4`);
fs.writeFileSync(clip, Buffer.from('mp4'));
jobs.setMediaFile((uid, hash) => (uid === 'u-form' && hash === VID ? { path: clip, ext: 'mp4', mime: 'video/mp4', size: 3 } : null));
writeState(DIR, 'u-form', sampleState());

test('the form route answers 409 for a video not on the server, and 202 for one that is', async () => {
  const sent = [];
  const route = (hash) => coachRoutes({
    json: (res, status, body) => sent.push({ status, body }),
    readBody: async () => ({ media: { hash, mime: 'video/mp4' }, exercise: { id: '3593', name: 'barbell squat' }, set: { w: 80, r: 5 }, pose: null }),
    readSession: () => ({ id: 'u-form' }),
    requireAdmin: () => true,
  })['POST /api/coach/form'];
  await route('e'.repeat(64))({ headers: {} }, {});
  assert.deepEqual(sent.at(-1), { status: 409, body: { error: 'media-missing' } });
  await route(VID)({ headers: {} }, {});
  assert.equal(sent.at(-1).status, 202);
  while (jobs.status('u-form').job) await new Promise(r => setTimeout(r, 25));
  assert.equal(jobs.readUser('u-form').pending.score, 7);
});
