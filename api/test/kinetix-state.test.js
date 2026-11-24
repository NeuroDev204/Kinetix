// Kinetix state keys (meals, english, nutritionPlan) on the server side: the sync stamps, the
// token scope, and which media a meal photo keeps alive.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAMPED_MAPS } from '../sync-stamps.js';
import { scopedState } from '../tokens.js';
import { referencedHashes } from '../media.js';

const HASH = 'c'.repeat(64);
const ALL_APPLY = { workouts: 'apply', plans: 'apply', bodyweight: 'apply', measurements: 'apply', notes: 'apply' };

test('meals and english are stamped per entry on the server', () => {
  assert.ok(STAMPED_MAPS.includes('meals'));
  assert.ok(STAMPED_MAPS.includes('english'));
});

test('a token with every category at apply cannot read meals, english or the nutrition plan', () => {
  const S = { meals: { m1: { d: '2026-11-24', _ts: 1 } }, english: { '2026-11-24': { transcript: 'hi', _ts: 1 } }, nutritionPlan: { kcal: 2000 }, workouts: [] };
  const out = scopedState(S, ALL_APPLY);
  assert.equal(out.meals, undefined);
  assert.equal(out.english, undefined);
  assert.equal(out.nutritionPlan, undefined);
});

test('a meal photo keeps its blob referenced', () => {
  const hashes = referencedHashes({ meals: { m1: { m: { hash: HASH, mime: 'image/jpeg' }, _ts: 1 } } });
  assert.ok(hashes.has(HASH));
});
