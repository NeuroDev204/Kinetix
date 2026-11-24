// Flow 4: the free tier's quota. A meal photo hits the limit, the screen says so, the meal stays
// retryable, and a retry after the limit lifts gets the dishes.
import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { startStack } from './stack.js'
import { startFakeLlm } from './fake-llm.mjs'
import { signIn, agreeCoach } from './helpers.js'
import { fakeCoach } from './coach-config.js'

const MEAL = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'meal.png')
let stack, llm
test.beforeAll(async () => {
  llm = await startFakeLlm()
  stack = await startStack({ coach: fakeCoach(llm.baseUrl) })
})
test.afterAll(async () => { await stack?.stop(); await llm?.stop() })

test('a quota error on a meal is said plainly, and the meal can be tried again', async ({ page }) => {
  test.setTimeout(240000)
  await signIn(page, stack.baseURL)
  await page.goto(stack.baseURL + '/#/coach/intake')
  await page.getByRole('button', { name: 'I understand' }).click()
  await agreeCoach(page)
  await page.goto(stack.baseURL + '/#/nutrition')
  llm.setQuota(true)
  await page.locator('input[type="file"][capture="environment"]').setInputFiles(MEAL)
  await agreeCoach(page)
  await expect(page.getByText('Could not analyse this photo')).toBeVisible({ timeout: 150000 })
  llm.setQuota(false)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Fixture rice')).toBeVisible({ timeout: 60000 })
})
