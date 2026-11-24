// Vision jobs send the person's own photo inline to Gemini. Only the user's stored media, only by
// a store hash; a catalogue path or an oversize set is refused before anything is read.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadMedia } from '../coach/media-input.js';
import { geminiSpec } from '../coach/core/adapters/gemini.js';
import { MediaError } from '../media.js';

const HASH = 'a'.repeat(64);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetix-media-'));
const file = path.join(dir, `${HASH}.jpg`);
fs.writeFileSync(file, Buffer.from('jpegbytes'));
const store = (uid, hash) => (hash === HASH ? { path: file, ext: 'jpg', mime: 'image/jpeg', size: 9 } : null);

test('a stored photo becomes one inline part after the text in the Gemini body', async () => {
  const media = await loadMedia('alice', [{ hash: HASH, mime: 'image/jpeg' }], { mediaFile: store });
  assert.equal(media[0].mimeType, 'image/jpeg');
  assert.equal(media[0].data, Buffer.from('jpegbytes').toString('base64'));
  const body = geminiSpec.body({ model: 'gemini-3.8-flash', prompt: 'look', system: null, schema: null, maxTokens: 100, media });
  assert.equal(body.contents[0].parts[0].text, 'look');
  assert.equal(body.contents[0].parts[1].inlineData.mimeType, 'image/jpeg');
});

test('a body without media is unchanged', () => {
  const body = geminiSpec.body({ model: 'm', prompt: 'look', system: null, schema: null, maxTokens: 100 });
  assert.equal(body.contents[0].parts.length, 1);
});

test('a hash the store does not hold is 409 media-missing', async () => {
  await assert.rejects(loadMedia('alice', [{ hash: 'b'.repeat(64), mime: 'image/jpeg' }], { mediaFile: store }),
    e => e instanceof MediaError && e.status === 409 && e.code === 'media-missing');
});

test('more than the byte cap is 413 too-large, and nothing is read', async () => {
  const big = () => ({ path: '/nonexistent', ext: 'jpg', mime: 'image/jpeg', size: 21 * 1024 * 1024 });
  await assert.rejects(loadMedia('alice', [{ hash: HASH, mime: 'image/jpeg' }], { mediaFile: big }),
    e => e instanceof MediaError && e.status === 413 && e.code === 'too-large');
});

test('a catalogue path is refused by the hash rule before the store is asked', async () => {
  let asked = false;
  const spy = () => { asked = true; return null; };
  await assert.rejects(loadMedia('alice', [{ hash: '../../catalogue/media/still/0001.webp', mime: 'image/webp' }], { mediaFile: spy }),
    e => e instanceof MediaError && e.status === 400);
  assert.equal(asked, false);
});
