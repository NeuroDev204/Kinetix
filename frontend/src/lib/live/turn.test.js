import { describe, it, expect, vi } from 'vitest'
import { createTurnTimer } from './turn.js'

describe('turn timer', () => {
  it('ends the turn after the silence, once the person has spoken', () => {
    const onEnd = vi.fn()
    const t = createTurnTimer({ silenceMs: 3000, threshold: 0.01, onEnd })
    t.feed(0.2, 0)
    t.feed(0.0, 1000)
    t.feed(0.0, 3900)
    expect(onEnd).not.toHaveBeenCalled()
    t.feed(0.0, 4000)
    expect(onEnd).toHaveBeenCalledTimes(1)
    t.feed(0.0, 9000)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('silence before anyone spoke does not end the turn', () => {
    const onEnd = vi.fn()
    const t = createTurnTimer({ silenceMs: 100, onEnd })
    t.feed(0, 0); t.feed(0, 5000)
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('a word in the silence starts the count again', () => {
    const onEnd = vi.fn()
    const t = createTurnTimer({ silenceMs: 1000, onEnd })
    t.feed(0.3, 0); t.feed(0, 500); t.feed(0.3, 800); t.feed(0, 1200)
    expect(onEnd).not.toHaveBeenCalled()
    t.feed(0, 2300)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })
})
