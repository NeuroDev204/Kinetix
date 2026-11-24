// Flow 1: the intake takes the body facts and sets the starting calorie target, which the nutrition
// screen then shows. (The plan request itself is not part of this flow: the stand-in model does not
// answer plans, so the request fails after the answers are saved, as the intake's own tests pin.)
import { test, expect } from '@playwright/test'
import { startStack } from './stack.js'
import { startFakeLlm } from './fake-llm.mjs'
import { signIn } from './helpers.js'
import { completeIntake } from './intake.js'
import { fakeCoach } from './coach-config.js'

let stack, llm
test.beforeAll(async () => {
  llm = await startFakeLlm()
  stack = await startStack({ coach: fakeCoach(llm.baseUrl) })
})
test.afterAll(async () => { await stack?.stop(); await llm?.stop() })

test('the intake sets the starting target and the nutrition screen shows it', async ({ page }) => {
  await signIn(page, stack.baseURL)
  await completeIntake(page, stack.baseURL)
  await page.evaluate(() => { location.hash = '#/nutrition' })
  // Three training days by default: 1835 kcal, the starting target for these facts.
  await expect(page.locator('.nutr-kcal')).toContainText('1835')
})
