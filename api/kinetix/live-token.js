// Gemini Live: a short-lived, single-use token the phone uses to open the live socket. The API key
// never leaves the server; the phone gets the token and the socket address only.
import { GoogleGenAI } from '@google/genai';

export const LIVE_WS = process.env.KINETIX_LIVE_WS || 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';
const TOKEN_MS = 30 * 60 * 1000;
const SESSION_MS = 60 * 1000;

/** Mints one token for one live session on `model`. `genai` is injectable for tests. */
export async function mintLiveToken({ apiKey, model, now = Date.now, genai = o => new GoogleGenAI(o) }) {
  const ai = genai({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
  const t = now();
  const res = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(t + TOKEN_MS).toISOString(),
      newSessionExpireTime: new Date(t + SESSION_MS).toISOString(),
      liveConnectConstraints: { model },
    },
  });
  return { token: res.name, model, expiresAt: t + TOKEN_MS };
}

const fakeGenai = () => ({ authTokens: { create: async () => ({ name: 'fake-token' }) } });

/** POST /api/kinetix/live-token: signed in, consent given, a live route configured. */
export function kinetixRoutes({ json, readBody, readSession, cfgStore, credentialFor, consented, genai }) {
  return {
    'POST /api/kinetix/live-token': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      if (!consented(user.id)) return json(res, 403, { error: 'consent', code: 'consent' });
      const cfg = cfgStore.load();
      if (!cfg.routing || !cfg.routing.live) return json(res, 503, { error: 'no-live', code: 'no-live' });
      const cred = credentialFor(user.id, cfg.routing.live);
      // A route with no key on the instance is only valid for the E2E stand-in (KINETIX_FAKE_GENAI).
      const fake = process.env.KINETIX_FAKE_GENAI === '1';
      if (!cred.ok || (!cred.auth && !fake)) return json(res, 503, { error: 'no-live', code: 'no-live' });
      try {
        const out = await mintLiveToken({
          apiKey: cred.auth ? cred.auth.token : 'fake',
          model: cfg.routing.liveModel,
          genai: process.env.KINETIX_FAKE_GENAI === '1' ? fakeGenai : genai,
        });
        return json(res, 200, { token: out.token, model: out.model, expiresAt: out.expiresAt, wsUrl: LIVE_WS });
      } catch (e) {
        const quota = e && (e.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(String(e.message || '')));
        return json(res, quota ? 429 : 502, { error: quota ? 'quota' : 'provider', code: quota ? 'quota' : 'provider' });
      }
    },
  };
}
