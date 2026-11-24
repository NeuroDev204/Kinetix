// The English summary: mistakes and new words are checked before they are kept, the payload carries
// the transcript only, and the route refuses an empty transcript.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnglish } from '../coach/core/validate.js';
import { buildEnglish } from '../coach/core/physique.js';
import { buildPromptParts } from '../coach/core/prompt.js';
import { SCHEMAS } from '../coach/core/schemas.js';

test('a summary with mistakes and words is kept', () => {
  const r = validateEnglish({ coach_contract: 1, mistakes: [{ said: 'me go gym', better: 'I go to the gym' }], newWords: ['gym'] });
  assert.equal(r.ok, true);
  assert.equal(r.proposal.mistakes[0].better, 'I go to the gym');
});

test('empty lists are a valid summary', () => {
  assert.equal(validateEnglish({ coach_contract: 1, mistakes: [], newWords: [] }).ok, true);
});

test('too many mistakes or an over-long line is refused', () => {
  const many = Array.from({ length: 21 }, () => ({ said: 'a', better: 'b' }));
  assert.equal(validateEnglish({ coach_contract: 1, mistakes: many, newWords: [] }).ok, false);
  assert.equal(validateEnglish({ coach_contract: 1, mistakes: [{ said: 'x'.repeat(201), better: 'b' }], newWords: [] }).ok, false);
});

test('the payload carries the transcript and the day, and the prompt has its own schema', () => {
  const p = buildEnglish({ handle: 'h1', lang: 'vi', transcript: 'You: me go gym', day: '2026-11-24' });
  assert.equal(p.task, 'english-summary');
  assert.equal(p.transcript, 'You: me go gym');
  assert.ok(!JSON.stringify(p).includes('catalogue'));
  assert.ok(SCHEMAS['english-summary']);
  assert.match(buildPromptParts('english-summary', p, null).system, /mistake/i);
});

test('an empty transcript is refused by the builder', () => {
  assert.throws(() => buildEnglish({ handle: 'h1', lang: 'vi', transcript: '   ', day: '2026-11-24' }));
});
