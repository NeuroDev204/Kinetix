// The phone's audio session for a live voice turn: while a turn is on, the speaker and the mic
// share one session (Bluetooth earphones included), and the rest cues stay quiet so they never
// reconfigure the session mid-turn. Native calls go through the RestAlert plugin (RestAlertPlugin.swift).
import { MOBILE } from './mobile.js'

let active = false
let plugin = null
const after = []
const routeSubs = []

async function nativePlugin() {
  if (!MOBILE) return null
  if (!plugin) {
    const { registerPlugin } = await import('@capacitor/core')
    const RestAlert = registerPlugin('RestAlert')
    RestAlert.addListener?.('voiceRoute', e => routeSubs.forEach(cb => cb(e)))
    plugin = { RestAlert }
  }
  return plugin
}

/** Starts a voice turn. Resolves { input }: 'bluetooth' | 'headset' | 'builtin' | 'web'. */
export async function beginVoiceTurn() {
  active = true
  const p = await nativePlugin().catch(() => null)
  if (!p) return { input: 'web' }
  try { return await p.RestAlert.beginVoice() } catch { return { input: 'builtin' } }
}

/** Ends the turn, gives the session back to the music, then runs what waited for it. */
export async function endVoiceTurn() {
  const p = await nativePlugin().catch(() => null)
  if (p) { try { await p.RestAlert.endVoice() } catch { /* the session is already gone */ } }
  active = false
  for (const fn of after.splice(0)) fn()
}

export const voiceTurnActive = () => active

/** Subscribes to the input changing mid-turn (a headset plugged in or out). Returns unsubscribe. */
export function onVoiceRoute(cb) {
  routeSubs.push(cb)
  return () => { const i = routeSubs.indexOf(cb); if (i >= 0) routeSubs.splice(i, 1) }
}

/** Runs fn now when no turn is on, else after the next endVoiceTurn. */
export function afterVoiceTurn(fn) {
  if (!active) fn()
  else after.push(fn)
}
