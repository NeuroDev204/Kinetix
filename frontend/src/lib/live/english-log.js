// The English log: one entry per day in S.english, the trainer conversation as text, and the Coach's
// summary of mistakes and new words. Pure: the caller decides when to save and when to ask.

export const TRANSCRIPT_MAX = 20000

/** Adds one line of the conversation to the day's transcript, keeping the latest words. */
export function appendTranscript(S, day, { role, text }, now = Date.now()) {
  S.english = S.english || {}
  const cur = S.english[day] || { transcript: '', mistakes: [], newWords: [] }
  const who = role === 'user' ? 'You' : 'Trainer'
  let t = (cur.transcript ? cur.transcript + '\n' : '') + `${who}: ${String(text || '').trim()}`
  if (t.length > TRANSCRIPT_MAX) t = t.slice(t.length - TRANSCRIPT_MAX)
  S.english[day] = { ...cur, transcript: t, _ts: now }
}

/** The Coach's summary for the day: mistakes with their fixes, and new words. */
export function applyEnglishSummary(S, day, { mistakes = [], newWords = [] } = {}, now = Date.now()) {
  S.english = S.english || {}
  const cur = S.english[day] || { transcript: '', mistakes: [], newWords: [] }
  S.english[day] = { ...cur, mistakes: mistakes.slice(0, 20), newWords: newWords.slice(0, 20), _ts: now }
}

export function englishOf(S, day) {
  return (S.english && S.english[day]) || null
}
