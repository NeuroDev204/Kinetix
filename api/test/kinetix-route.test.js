// Per-kind provider routing for Kinetix. Vision kinds go to Gemini, long prompts go to Gemini,
// everything else stays on the local text model, and a failure falls back once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { providerForJob, fallbackFor, estimateTokens, VISION_KINDS } from '../coach/core/route.js';

const R = { provider: 'compatible', routing: { text: 'compatible', vision: 'gemini', fallback: 'gemini', ctx: 8192 } };

test('vision kinds go to the vision provider', () => {
  assert.deepEqual(VISION_KINDS, ['physique', 'meal', 'form']);
  assert.deepEqual(providerForJob(R, 'meal', 'x'), { provider: 'gemini', reason: 'vision' });
});

test('a prompt over ctx - 2048 tokens goes to the fallback, one under stays local', () => {
  assert.deepEqual(providerForJob(R, 'review', 'a'.repeat(21505)), { provider: 'gemini', reason: 'too-large' });
  assert.deepEqual(providerForJob(R, 'review', 'a'.repeat(21504)), { provider: 'compatible', reason: 'text' });
});

test('without routing the selected provider is used as it always was', () => {
  assert.deepEqual(providerForJob({ provider: 'fixture' }, 'meal', 'x'), { provider: 'fixture', reason: 'single' });
});

test('a fallback happens once, for transport and format failures only', () => {
  assert.equal(fallbackFor(R, 'compatible', 'quota'), null);
  assert.equal(fallbackFor(R, 'gemini', 'schema'), null);
  assert.equal(fallbackFor(R, 'compatible', 'unreachable'), 'gemini');
  assert.equal(fallbackFor({ provider: 'fixture' }, 'compatible', 'unreachable'), null);
});

test('estimateTokens is chars over 3.5, rounded up', () => {
  assert.equal(estimateTokens('a'.repeat(7)), 2);
  assert.equal(estimateTokens(''), 0);
});
