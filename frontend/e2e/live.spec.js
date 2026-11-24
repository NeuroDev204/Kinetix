// Flow 5, the live channel: the trainer's session opens against the stand-in socket, the microphone's
// audio (a file, fed to Chromium) gets a log_set tool call, the answer goes back, and the words land in
// the day's English log. The set logging on the workout screen itself is not part of this run.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startStack } from './stack.js'
import { startFakeLlm } from './fake-llm.mjs'
import { startFakeLive } from './fake-live-server.mjs'
import { signIn } from './helpers.js'
import { fakeCoach } from './coach-config.js'
import { completeIntake } from './intake.js'

let stack, llm, live
test.beforeAll(async () => {
  llm = await startFakeLlm()
  live = await startFakeLive(3199)
  stack = await startStack({ coach: fakeCoach(llm.baseUrl), env: { KINETIX_LIVE_WS: live.url, KINETIX_FAKE_GENAI: '1' } })
})
test.afterAll(async () => { await stack?.stop(); await live?.stop(); await llm?.stop() })

test('a spoken set reaches the trainer, the tool answer goes back, and the words land in the English log', async ({ page }) => {
  test.setTimeout(180000)
  await signIn(page, stack.baseURL)
  await completeIntake(page, stack.baseURL)
  await page.evaluate(async () => {
    const v = await import('/src/lib/live/voice.js')
    await v.liveTrainer({ todaySummary: '', unit: 'kg' }).startTurn()
  })
  await expect.poll(() => page.evaluate(async () => {
    const { useStore } = await import('/src/store/useStore.js')
    return JSON.stringify(useStore.getState().S.english || {})
  }), { timeout: 90000 }).toContain('eighty kilos')
  expect(live.received.some(m => m.toolResponse?.functionResponses?.[0]?.id === 'c1')).toBe(true)
  await page.evaluate(() => { location.hash = '#/english' })
  await page.getByText('What was said').click()
  await expect(page.getByText('You: log eighty kilos five reps')).toBeVisible({ timeout: 30000 })
})
