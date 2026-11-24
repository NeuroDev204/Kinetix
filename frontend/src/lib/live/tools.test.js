// The trainer's tools: which set a spoken log lands on, the rest-time limits, and the refusals when
// no workout is open.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { logNextSet, bindVoiceActions, handleToolCall } from './tools.js'

const session = [
  { name: 'Back squat', sets: [{ w: 100, r: 5, done: true }, { w: 100, r: 5, done: false }, { w: 100, r: 5, done: false }] },
  { name: 'Bench press', sets: [{ w: 60, r: 8, done: false }] },
]

describe('logNextSet', () => {
  it('fills the first open set of the current exercise', () => {
    expect(logNextSet(session, { weight: 80, reps: 5 })).toEqual({ ok: true, idx: 0, i: 1, exercise: 'Back squat', set: 2, weight: 80, reps: 5 })
  })

  it('a named exercise is found by name, and an unknown one is refused', () => {
    expect(logNextSet(session, { exercise: 'bench press', weight: 62.5 })).toMatchObject({ ok: true, idx: 1, i: 0, weight: 62.5 })
    expect(logNextSet(session, { exercise: 'Deadlift' })).toEqual({ ok: false, error: "not in today's session" })
  })

  it('with every set done there is nothing to log', () => {
    expect(logNextSet([{ name: 'x', sets: [{ done: true }] }], {})).toEqual({ ok: false, error: 'no open set' })
  })
})

describe('handleToolCall', () => {
  afterEach(() => bindVoiceActions(null))

  it('is refused when no workout is open', async () => {
    expect(await handleToolCall({ name: 'log_set', args: {} })).toEqual({ ok: false, error: 'no workout is open' })
  })

  it('log_set goes to the bound handler', async () => {
    const logSet = vi.fn(() => ({ ok: true }))
    bindVoiceActions({ logSet, startRest: vi.fn(), nextExercise: vi.fn(), today: vi.fn() })
    expect(await handleToolCall({ name: 'log_set', args: { weight: 80, reps: 5 } })).toEqual({ ok: true })
    expect(logSet).toHaveBeenCalledWith({ weight: 80, reps: 5 })
  })

  it('a rest outside 15-600 seconds is refused, and a good one starts the rest', async () => {
    const startRest = vi.fn()
    bindVoiceActions({ logSet: vi.fn(), startRest, nextExercise: vi.fn(), today: vi.fn() })
    expect(await handleToolCall({ name: 'start_rest', args: { seconds: 5 } })).toEqual({ ok: false, error: 'seconds 15-600' })
    expect(startRest).not.toHaveBeenCalled()
    expect(await handleToolCall({ name: 'start_rest', args: { seconds: 90 } })).toEqual({ ok: true, seconds: 90 })
    expect(startRest).toHaveBeenCalledWith(90)
  })

  it('next_exercise moves on', async () => {
    const nextExercise = vi.fn()
    bindVoiceActions({ logSet: vi.fn(), startRest: vi.fn(), nextExercise, today: vi.fn() })
    await handleToolCall({ name: 'next_exercise', args: {} })
    expect(nextExercise).toHaveBeenCalledTimes(1)
  })
})
