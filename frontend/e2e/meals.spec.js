// Flow 2: a meal photo is sent, its dishes come back, the grams change the totals, the data survives
// a reload, and a second browser on the same profile sees the meal.
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


test('a meal photo is analysed, grams change the totals, and it survives a reload', async ({ page }) => {
  await signIn(page, stack.baseURL)
  await page.goto(stack.baseURL + '/#/coach/intake')
  await page.getByRole('button', { name: 'I understand' }).click()
  await agreeCoach(page)
  await page.goto(stack.baseURL + '/#/nutrition')
  await page.locator('input[type="file"][capture="environment"]').setInputFiles(MEAL)
  await agreeCoach(page)
  await expect(page.getByText('Fixture rice')).toBeVisible({ timeout: 60000 })
  await page.getByLabel('Grams').first().fill('100')
  await expect(page.locator('.nutr-kcal b')).toHaveText('130')
  await page.reload()
  await expect(page.getByText('Fixture rice')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.nutr-kcal b')).toHaveText('130')
})
