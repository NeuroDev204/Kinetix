// Kinetix English practice: each day's conversation with the trainer, the mistakes the Coach found
// with their fixes, and the new words. A day can be summarised on request.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { englishOf, applyEnglishSummary } from '../lib/live/english-log.js'
import { requestEnglishSummary, coachStatus, resolvePending } from '../lib/coach-api.js'
import { Button } from '../components/ui.jsx'
import './Nutrition.css'

export default function English() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const days = Object.keys(S.english || {}).sort().reverse()
  const [note, setNote] = useState(null)
  const seen = useRef(null)
  const waiting = !!S.english && Object.values(S.english).some(d => d && d.pendingSummary)

  // The summary comes back as a pending proposal tagged with its day; take it into that day.
  useEffect(() => {
    if (!waiting) return undefined
    let alive = true
    const tick = async () => {
      try {
        const st = await coachStatus()
        const p = st?.pending
        if (alive && p && p.kind === 'english-summary' && p.day) {
          update(s => { applyEnglishSummary(s, p.day, p); if (s.english?.[p.day]) delete s.english[p.day].pendingSummary })
          await resolvePending({ accepted: ['english-summary'], rejected: [] }).catch(() => {})
        }
        const last = st?.last
        if (alive && !st?.job && last && last.kind === 'english-summary' && last.outcome === 'failed' && last.id !== seen.current) {
          seen.current = last.id
          setNote(t('Could not summarise that day. Try again later.'))
          update(s => { if (last.day && s.english?.[last.day]) delete s.english[last.day].pendingSummary })
        }
      } catch { /* try again on the next tick */ }
    }
    tick()
    const iv = setInterval(tick, 2000)
    return () => { alive = false; clearInterval(iv) }
  }, [waiting, update])

  const summarise = async day => {
    const e = englishOf(useStore.getState().S, day)
    if (!e?.transcript) return
    update(s => { if (s.english?.[day]) s.english[day].pendingSummary = true })
    try { await requestEnglishSummary(day, e.transcript); setNote(null) }
    catch (err) { update(s => { if (s.english?.[day]) delete s.english[day].pendingSummary }); setNote(err.message || t('Could not summarise that day. Try again later.')) }
  }

  return <div className="narrow nutrition">
    {days.length === 0 && <div className="muted small">{t('No English practice yet. Talk to your trainer during a workout and it shows up here.')}</div>}
    {note && <div className="ob-hint">{note}</div>}
    {days.map(day => {
      const e = S.english[day]
      return <section className="card nutr-meal" key={day}>
        <div className="nutr-meal-h"><b>{day}</b></div>
        {e.transcript && <details><summary className="small">{t('What was said')}</summary><pre className="small" style={{ whiteSpace: 'pre-wrap' }}>{e.transcript}</pre></details>}
        {e.mistakes?.length > 0 && <ul>{e.mistakes.map((m, i) => <li key={i}><s>{m.said}</s> → {m.better}</li>)}</ul>}
        {e.newWords?.length > 0 && <div className="small">{t('New words')}: {e.newWords.join(', ')}</div>}
        {e.pendingSummary ? <div className="small">{t('Summarising…')}</div>
          : <Button size="sm" onClick={() => summarise(day)}>{t('Summarise this day')}</Button>}
      </section>
    })}
  </div>
}
