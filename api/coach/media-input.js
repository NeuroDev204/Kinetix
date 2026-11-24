// Turns a profile's stored photo or video into the inline parts a vision provider takes. Server
// only (not in core/): it reads the disk. A ref is only ever resolved through the media store
// (`mediaFile`), and only by a hash that matches HASH_RE, so a path or a catalogue name never
// reaches the filesystem from here.
import fs from 'node:fs';
import { HASH_RE, MediaError } from '../media.js';

export async function loadMedia(uid, refs, { mediaFile, maxBytes = 20 * 1024 * 1024 } = {}) {
  const out = [];
  let total = 0;
  for (const r of refs || []) {
    if (!r || typeof r.hash !== 'string' || !HASH_RE.test(r.hash)) throw new MediaError(400, 'bad-request');
    const f = mediaFile ? mediaFile(uid, r.hash) : null;
    if (!f) throw new MediaError(409, 'media-missing');
    total += f.size;
    if (total > maxBytes) throw new MediaError(413, 'too-large');
    out.push({ mimeType: f.mime || r.mime, data: fs.readFileSync(f.path).toString('base64') });
  }
  return out;
}
