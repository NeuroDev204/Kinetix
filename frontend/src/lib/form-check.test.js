// @vitest-environment happy-dom
// Form feedback on a set: the result lands on the set, the trainer hears it when a session is open
// (and the phone does not also speak), and a video the server never gets is 'offline'.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  S: null,
  live: null,
  speak: vi.fn(),
  requestForm: vi.fn(),
  pending: null,
  coach: null,
  sync: vi.fn(),
  voiceActive: false,
  queued: [],
}))
vi.mock('../store/useStore.js', () => {
  const snap = () => ({ S: m.S, update: mut => mut(m.S) })
  const useStore = sel => (sel ? sel(snap()) : snap())
  useStore.getState = snap
  return { useStore }
})
vi.mock('./media-store.js', () => ({ getMediaStore: () => ({ get: async () => null }) }))
vi.mock('./pose/runner.js', () => ({ analyzeVideo: async () => ({ joint: 'knee', summary: null }) }))
vi.mock('./coach-api.js', () => ({
  requestForm: (...a) => m.requestForm(...a),
  coachStatus: async () => m.coach,
  resolvePending: async () => ({}),
}))
vi.mock('./media-sync.js', () => ({ syncMedia: (...a) => m.sync(...a) }))
vi.mock('./speech.js', () => ({ speak: (...a) => m.speak(...a) }))
vi.mock('./voice-session.js', () => ({
  afterVoiceTurn: fn => { if (m.voiceActive) m.queued.push(fn); else fn() },
}))
vi.mock('./live/voice.js', () => ({ currentLiveSession: () => m.live }))

const CONFLICT = () => Object.assign(new Error('media-missing'), { status: 409, data: { error: 'media-missing' } })
const form = { kind: 'form', setRef: { entry: 0, set: 1 }, score: 6, summary: 'Heels lifted.', issues: [{ rep: 2, issue: 'x', cue: 'Keep heels down.' }] }

beforeEach(() => {
  m.S = { active: { entries: [{ id: 'squat', name: 'Barbell squat', sets: [{ w: 80, r: 5, done: true }, { w: 80, r: 5, media: [{ hash: 'a'.repeat(64), kind: 'video', mime: 'video/mp4' }] }] }] } }
  m.live = null; m.speak.mockReset(); m.requestForm.mockReset().mockResolvedValue({ id: 'j' })
  m.coach = { job: null, pending: form, last: null }; m.sync.mockReset().mockResolvedValue(undefined)
  m.voiceActive = false; m.queued = []
})

describe('checkForm', () => {
  it('stores the result on the set', async () => {
    const { checkForm } = await import('./form-check.js')
    expect(await checkForm({ entryIdx: 0, setIdx: 1 })).toBe('done')
    expect(m.S.active.entries[0].sets[1].form).toMatchObject({ score: 6, summary: 'Heels lifted.' })
  })

  it('with a live session open, the trainer hears it and the phone does not speak', async () => {
    m.live = { isOpen: () => true, sendText: vi.fn() }
    const { checkForm } = await import('./form-check.js')
    await checkForm({ entryIdx: 0, setIdx: 1 })
    expect(m.live.sendText).toHaveBeenCalledWith('Tell the user briefly: Heels lifted. Keep heels down.')
    expect(m.speak).not.toHaveBeenCalled()
  })

  it('with no live session, the phone speaks it in English, and only once', async () => {
    const { checkForm } = await import('./form-check.js')
    await checkForm({ entryIdx: 0, setIdx: 1 })
    expect(m.speak).toHaveBeenCalledTimes(1)
    expect(m.speak).toHaveBeenCalledWith('Heels lifted. Keep heels down.', { lang: 'en-US' })
  })

  it('during a voice turn the announcement waits for the end of it', async () => {
    m.voiceActive = true
    const { checkForm } = await import('./form-check.js')
    await checkForm({ entryIdx: 0, setIdx: 1 })
    expect(m.speak).not.toHaveBeenCalled()
    expect(m.queued).toHaveLength(1)
    m.queued.forEach(fn => fn())
    expect(m.speak).toHaveBeenCalledTimes(1)
  })

  it('a video the server never receives is offline, after one more sync', async () => {
    m.requestForm.mockRejectedValue(CONFLICT())
    m.coach = { job: null, pending: null, last: null }
    const { checkForm } = await import('./form-check.js')
    expect(await checkForm({ entryIdx: 0, setIdx: 1 })).toBe('offline')
    expect(m.requestForm).toHaveBeenCalledTimes(2)
    expect(m.sync).toHaveBeenCalledTimes(2)
  })
})
