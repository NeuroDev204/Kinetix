// @vitest-environment happy-dom
// The voice audio session: the order of the native calls, the state between them, the cues that
// must wait, and the web build doing nothing native.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const native = vi.hoisted(() => ({ calls: [], listeners: {} }))
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
  registerPlugin: () => ({
    beginVoice: async () => { native.calls.push('beginVoice'); return { input: 'bluetooth' } },
    endVoice: async () => { native.calls.push('endVoice') },
    speak: async () => { native.calls.push('speak'); return { ok: true } },
    addListener: (name, cb) => { native.listeners[name] = cb },
  }),
}))
vi.mock('./mobile.js', () => ({ MOBILE: true, nativePlatform: async () => 'ios' }))

let vs
beforeEach(async () => {
  native.calls.length = 0
  vi.resetModules()
  vs = await import('./voice-session.js')
})

describe('voice session', () => {
  it('begin then end, in that order, and the state is on between', async () => {
    expect(vs.voiceTurnActive()).toBe(false)
    expect(await vs.beginVoiceTurn()).toEqual({ input: 'bluetooth' })
    expect(vs.voiceTurnActive()).toBe(true)
    await vs.endVoiceTurn()
    expect(vs.voiceTurnActive()).toBe(false)
    expect(native.calls).toEqual(['beginVoice', 'endVoice'])
  })

  it('a cue asked for during the turn waits for the end', async () => {
    await vs.beginVoiceTurn()
    const fn = vi.fn()
    vs.afterVoiceTurn(fn)
    expect(fn).not.toHaveBeenCalled()
    await vs.endVoiceTurn()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('a cue asked when no turn is on runs at once', () => {
    const fn = vi.fn()
    vs.afterVoiceTurn(fn)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('an input change reaches the subscribers, and unsubscribing stops it', async () => {
    await vs.beginVoiceTurn()
    const got = vi.fn()
    const off = vs.onVoiceRoute(got)
    native.listeners.voiceRoute({ input: 'builtin' })
    expect(got).toHaveBeenCalledWith({ input: 'builtin' })
    off()
    native.listeners.voiceRoute({ input: 'headset' })
    expect(got).toHaveBeenCalledTimes(1)
  })

  it('speech for the rest cue is refused while the turn is on, and not sent to the phone', async () => {
    const { speakNative } = await import('./rest-alert.js')
    await vs.beginVoiceTurn()
    const r = await speakNative('Rest is over')
    expect(r).toBe(false)
    expect(native.calls).toEqual(['beginVoice'])
    await vs.endVoiceTurn()
    expect(await speakNative('Rest is over')).toBe(true)
    expect(native.calls).toContain('speak')
  })
})
