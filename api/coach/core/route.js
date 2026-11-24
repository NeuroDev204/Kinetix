// Which provider runs a job. Pure: the caller passes the stored config, the job kind and the prompt
// text; nothing here reads a file or a key. Vision kinds need an image, so they go to the vision
// provider. A prompt too long for the local model's context goes to the fallback. Everything else
// stays on the text provider. A failure falls back once, and only for errors a second model can fix.

export const VISION_KINDS = ['physique', 'meal', 'form'];

const OUTPUT_RESERVE = 2048;
const FALLBACK_ERRORS = ['schema', 'cutoff', 'unreachable', 'timeout', 'provider'];

// shortcut: chars/3.5 heuristic, switch to the model tokenizer if routing misfires
export function estimateTokens(text) {
  return Math.ceil(String(text || '').length / 3.5);
}

export function providerForJob(cfg, kind, promptText) {
  const r = cfg && cfg.routing;
  if (!r) return { provider: cfg.provider, reason: 'single' };
  if (VISION_KINDS.includes(kind)) return { provider: r.vision, reason: 'vision' };
  if (estimateTokens(promptText) > r.ctx - OUTPUT_RESERVE) return { provider: r.fallback, reason: 'too-large' };
  return { provider: r.text, reason: 'text' };
}

export function fallbackFor(cfg, provider, errorClass) {
  const r = cfg && cfg.routing;
  if (!r || provider === r.fallback || !FALLBACK_ERRORS.includes(errorClass)) return null;
  return r.fallback;
}
