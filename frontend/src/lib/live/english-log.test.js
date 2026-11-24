// The English log: what the person said to the trainer each day, kept as a capped transcript, and
// the summary the Coach writes from it (mistakes with their fixes, new words). Pure.
import { describe, it, expect } from 'vitest'
import { appendTranscript, applyEnglishSummary, englishOf, TRANSCRIPT_MAX } from './english-log.js'

const NOW = Date.parse('2026-11-24T10:00:00Z')

describe('english log', () => {
  it('appends the person and the trainer, one line each, for the day', () => {
    const S = {}
    appendTranscript(S, '2026-11-24', { role: 'user', text: 'I did five reps' }, NOW)
    appendTranscript(S, '2026-11-24', { role: 'trainer', text: 'Great.' }, NOW)
    expect(englishOf(S, '2026-11-24').transcript).toBe('You: I did five reps\nTrainer: Great.')
    expect(englishOf(S, '2026-11-23')).toBe(null)
  })

  it('caps the transcript, keeping the latest words', () => {
    const S = {}
    for (let i = 0; i < 2000; i++) appendTranscript(S, '2026-11-24', { role: 'user', text: 'word '.repeat(4) + i }, NOW)
    const t = englishOf(S, '2026-11-24').transcript
    expect(t.length).toBeLessThanOrEqual(TRANSCRIPT_MAX)
    expect(t.endsWith('1999')).toBe(true)
  })

  it('a summary is stored beside the transcript, and empty lists are kept empty', () => {
    const S = {}
    appendTranscript(S, '2026-11-24', { role: 'user', text: 'me go gym' }, NOW)
    applyEnglishSummary(S, '2026-11-24', { mistakes: [{ said: 'me go gym', better: 'I go to the gym' }], newWords: ['gym'] }, NOW)
    expect(englishOf(S, '2026-11-24')).toMatchObject({ mistakes: [{ said: 'me go gym', better: 'I go to the gym' }], newWords: ['gym'] })
    applyEnglishSummary(S, '2026-11-24', {}, NOW)
    expect(englishOf(S, '2026-11-24')).toMatchObject({ mistakes: [], newWords: [] })
  })
})
