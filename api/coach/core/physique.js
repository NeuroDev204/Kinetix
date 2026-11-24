// The physique job (Kinetix): one body photo in, an estimated body-fat range and notes out.
// Pure: no store, no disk. The server reads the photo itself (coach/media-input.js); what goes to
// the provider is the payload built here, which never carries the photo or a catalogue path.

export const PHYSIQUE_BODY_KEYS = ['sex', 'age', 'heightCm', 'weightKg', 'goalKg'];

/** Checks the facts the app sends with the photo. Returns { ok, body } or { ok:false, error }. */
export function cleanPhysiqueBody(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, error: 'body' };
  const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);
  const sex = b.sex === 'm' || b.sex === 'f' ? b.sex : null;
  const age = num(b.age, 10, 100);
  const heightCm = num(b.heightCm, 100, 250);
  const weightKg = num(b.weightKg, 30, 300);
  const goalKg = num(b.goalKg, 30, 300);
  if (!sex || age == null || heightCm == null || weightKg == null || goalKg == null) return { ok: false, error: 'body' };
  return { ok: true, body: { sex, age, heightCm, weightKg, goalKg } };
}

/** The payload a physique job sends: the facts, the coach contract and the day. No photo. */
export function buildPhysique({ handle, lang, body, now = Date.now() }) {
  const d = new Date(now);
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    coach_contract: 1,
    task: 'physique',
    meta: { profile: handle, lang: lang || 'en', today },
    body
  };
}

/** A photo ref as the client sends it: a store hash and a mime type, nothing else. */
export function cleanMediaRef(m) {
  if (!m || typeof m !== 'object' || typeof m.hash !== 'string') return null;
  if (!/^[0-9a-f]{64}$/.test(m.hash)) return null;
  const mime = typeof m.mime === 'string' && /^image\/(jpeg|png|webp)$/.test(m.mime) ? m.mime : 'image/jpeg';
  return { hash: m.hash, mime };
}

/** The payload a meal job sends: the day and the language. The photo travels apart, as for physique. */
/** The English summary's payload: the transcript of the day (the person's own words, read by the model once) and the day. */
export function buildEnglish({ handle, lang, transcript, day, now = Date.now() }) {
  const text = String(transcript || '').trim().slice(0, 20000);
  if (!text) throw new Error('empty transcript');
  return { coach_contract: 1, task: 'english-summary', meta: { profile: handle, lang: lang || 'en', today: day || new Date(now).toISOString().slice(0, 10) }, transcript: text };
}

export function buildMeal({ handle, lang, now = Date.now() }) {
  const d = new Date(now);
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { coach_contract: 1, task: 'meal', meta: { profile: handle, lang: lang || 'en', today } };
}
