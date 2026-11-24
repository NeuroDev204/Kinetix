// Form feedback for a set video: the phone measures the joint (pose), the server reads the video
// with those numbers, and the result is kept on the set. The announcement goes to the live trainer if
// it is talking now, else is spoken on the phone; never both.
import { useStore } from '../store/useStore.js'
import { getMediaStore } from './media-store.js'
import { analyzeVideo } from './pose/runner.js'
import { requestForm, coachStatus, resolvePending } from './coach-api.js'
import { syncMedia } from './media-sync.js'
import { speak } from './speech.js'
import { afterVoiceTurn } from './voice-session.js'
import { currentLiveSession } from './live/voice.js'

const WAIT_MS = 180000
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function setVideo(entryIdx, setIdx) {
  const A = useStore.getState().S.active
  const set = A?.entries?.[entryIdx]?.sets?.[setIdx]
  const media = (set?.media || []).find(m => m && m.kind === 'video') || set?.media?.[0]
  return { set, exercise: A?.entries?.[entryIdx], media }
}

/** Waits for the form job's answer on this set, polling the status the way the other jobs do. */
async function waitForForm(entryIdx, setIdx) {
  const until = Date.now() + WAIT_MS
  while (Date.now() < until) {
    const st = await coachStatus().catch(() => null)
    const p = st?.pending
    if (p && p.kind === 'form' && p.setRef && p.setRef.entry === entryIdx && p.setRef.set === setIdx) {
      await resolvePending({ accepted: ['form'], rejected: [] }).catch(() => {})
      return p
    }
    if (st && !st.job && st.last && st.last.kind === 'form' && st.last.outcome === 'failed') return null
    await sleep(2000)
  }
  return null
}

/** Announces the result: to the trainer when a live session is open, else on the phone. */
function announce(text) {
  if (!text) return
  afterVoiceTurn(() => {
    const live = currentLiveSession()
    if (live && live.isOpen()) live.sendText('Tell the user briefly: ' + text)
    else speak(text, { lang: 'en-US' })
  })
}

/** Returns 'done' (the result is on the set), 'offline' (the video never reached the server), or 'failed'. */
export async function checkForm({ entryIdx, setIdx }) {
  const { set, exercise, media } = await setVideo(entryIdx, setIdx)
  if (!set || !media) return 'failed'
  const stored = await getMediaStore().get(media.hash).catch(() => null)
  const pose = stored?.blob ? await analyzeVideo(stored.blob, { exerciseId: exercise?.id }).then(r => r.summary || null, () => null) : null
  const ref = { hash: media.hash, mime: media.mime || 'video/mp4' }
  const send = () => requestForm({ exerciseId: exercise?.id, exerciseName: exercise?.name, set: { w: set.w, r: set.r }, summary: pose, media: ref, setRef: { entry: entryIdx, set: setIdx } })
  await syncMedia({ force: true })
  try { await send() } catch (e) {
    if (!(e?.status === 409 || e?.data?.error === 'media-missing')) return 'failed'
    await syncMedia({ force: true })
    try { await send() } catch (e2) { return e2?.status === 409 || e2?.data?.error === 'media-missing' ? 'offline' : 'failed' }
  }
  const p = await waitForForm(entryIdx, setIdx)
  if (!p) return 'failed'
  const form = { score: p.score, summary: p.summary, issues: p.issues || [], at: Date.now() }
  useStore.getState().update(s => {
    const row = s.active?.entries?.[entryIdx]?.sets?.[setIdx]
    if (row) row.form = form
  })
  const cue = form.issues[0]?.cue
  announce([form.summary, cue].filter(Boolean).join(' '))
  return 'done'
}
