// Flow 3: the weekly review proposes a calorie target with its meal plan. Applying it moves the
// target; Undo in the Coach's menu puts the previous one back.
import { test, expect } from '@playwright/test'
import { startStack } from './stack.js'
import { startFakeLlm } from './fake-llm.mjs'
import { signIn, agreeCoach } from './helpers.js'
import { fakeCoach } from './coach-config.js'
import { completeIntake } from './intake.js'

let stack, llm
test.beforeAll(async () => {
  llm = await startFakeLlm()
  stack = await startStack({ coach: fakeCoach(llm.baseUrl) })
})
test.afterAll(async () => { await stack?.stop(); await llm?.stop() })

test('a review moves the calorie target, and Undo puts it back', async ({ page }) => {
  test.setTimeout(240000)
  await signIn(page, stack.baseURL)
  await completeIntake(page, stack.baseURL)
  await page.getByRole('button', { name: 'Review my training' }).click()
  await expect(page.locator('[data-nutrition]')).toBeVisible({ timeout: 120000 })
  await page.getByRole('button', { name: /Apply/ }).click()
  await page.evaluate(() => { location.hash = '#/nutrition' })
  await expect(page.locator('.nutr-kcal')).toContainText('1850')
  await page.evaluate(() => { location.hash = '#/coach' })
  await page.getByRole('button', { name: 'More' }).click()
  await page.getByRole('button', { name: 'Undo the last Coach changes' }).click()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await page.evaluate(() => { location.hash = '#/nutrition' })
  await expect(page.locator('.nutr-kcal')).toContainText('1835')
})
