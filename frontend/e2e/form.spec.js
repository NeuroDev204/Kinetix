// Flow 6: a set video is analysed for form. The pose numbers come from a dev fixture (five reps of
// the knee), the stand-in model answers the form job, and the result lands on the set.
import { test, expect } from '@playwright/test'
import { startStack } from './stack.js'
import { startFakeLlm } from './fake-llm.mjs'
import { signIn } from './helpers.js'
import { fakeCoach } from './coach-config.js'
import { completeIntake } from './intake.js'

let stack, llm
test.beforeAll(async () => {
  llm = await startFakeLlm()
  stack = await startStack({ coach: fakeCoach(llm.baseUrl) })
})
test.afterAll(async () => { await stack?.stop(); await llm?.stop() })

test('during a live workout a set video waits for the server: form feedback is offline until the workout is saved', async ({ page }) => {
  test.setTimeout(240000)
  await signIn(page, stack.baseURL)
  await completeIntake(page, stack.baseURL)
  const result = await page.evaluate(async () => {
    // Five cycles of the knee between 170 and 80 degrees, as landmarks the pose runner reads.
    const frames = []
    for (let i = 0; i <= 200; i++) {
      const th = (i / 40) * 2 * Math.PI
      const deg = 125 + 45 * Math.cos(th)
      const rad = (180 - deg) * Math.PI / 180
      const lms = []
      lms[23] = { x: 0, y: -1, visibility: 1 }; lms[25] = { x: 0, y: 0, visibility: 1 }; lms[27] = { x: Math.sin(rad), y: Math.cos(rad), visibility: 1 }
      lms[24] = lms[23]; lms[26] = lms[25]; lms[28] = lms[27]
      frames.push({ t: i * 100, landmarks: lms })
    }
    window.__KINETIX_POSE_FIXTURE__ = frames
    // A small video: a canvas recorded for a second.
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
    const ctx = canvas.getContext('2d')
    const paint = setInterval(() => { ctx.fillStyle = 'hsl(' + (Date.now() % 360) + ' 60% 50%)'; ctx.fillRect(0, 0, 64, 64) }, 50)
    const stream = canvas.captureStream(10)
    const rec = new MediaRecorder(stream, { mimeType: 'video/mp4' })
    const chunks = []
    rec.ondataavailable = e => chunks.push(e.data)
    rec.start()
    await new Promise(r => setTimeout(r, 1000))
    rec.stop()
    clearInterval(paint)
    await new Promise(r => { rec.onstop = r })
    const blob = new Blob(chunks, { type: 'video/mp4' })
    const buf = await blob.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buf)
    const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
    const { useStore } = await import('/src/store/useStore.js')
    const { getMediaStore } = await import('/src/lib/media-store.js')
    const { attachSetVideo } = await import('/src/lib/set-videos.js')
    const { syncMedia } = await import('/src/lib/media-sync.js')
    const { checkForm } = await import('/src/lib/form-check.js')
    const today = new Date().toISOString().slice(0, 10)
    useStore.getState().update(s => {
      s.active = { id: 'live-e2e', d: today, start: Date.now(), entries: [{ id: '3593', name: 'barbell squat', target: { sets: 2, reps: 5 }, sets: [{ w: 80, r: 5, done: true }, { w: 80, r: 5, done: false }] }] }
    })
    await getMediaStore().put(hash, blob, { mime: 'video/mp4' })
    let attached = null
    useStore.getState().update(s => { attached = attachSetVideo(s, { entry: 0, set: 1 }, { hash, mime: 'video/mp4', kind: 'video', size: blob.size, width: 64, height: 64, dur: 1 }) })
    window.__ATTACHED = attached
    await syncMedia({ force: true })
    const setMedia = useStore.getState().S.active.entries[0].sets[1].media || null
    const outcome = await checkForm({ entryIdx: 0, setIdx: 1 })
    return { attached: window.__ATTACHED, outcome, setMedia, form: useStore.getState().S.active.entries[0].sets[1].form || null }
  })
  // The live workout does not sync, so the server does not have the clip yet: the check waits (offline).
  expect(result.attached).toBe('added')
  expect(result.outcome).toBe('offline')
  expect(result.form).toBe(null)
  expect(result.setMedia[0].kind).toBe('video')
})
