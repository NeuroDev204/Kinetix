// The intake, driven through the screens a new profile sees: consent, goal, body facts, photo
// skipped, experience, then Continue through the rest. Ends with the plan request queued.
import { expect } from '@playwright/test'
import { agreeCoach } from './helpers.js'

export async function completeIntake(page, baseURL) {
  await page.goto(baseURL + '/#/coach/intake')
  await page.getByRole('button', { name: 'I understand' }).click()
  await agreeCoach(page)
  await page.getByRole('button', { name: 'Build muscle' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Birth year', { exact: true }).fill(String(new Date().getFullYear() - 25))
  await page.getByLabel('Height (cm)', { exact: true }).fill('175')
  await page.getByLabel('Weight (kg)', { exact: true }).fill('70')
  await page.getByLabel('Goal weight (kg)', { exact: true }).fill('65')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.locator('.ob-choice').first().click()
  for (let i = 0; i < 8; i++) {
    if (await page.getByRole('button', { name: 'Build my plan' }).isVisible().catch(() => false)) break
    await page.locator('.ob-foot .btn').click()
  }
  await page.getByRole('button', { name: 'Build my plan' }).click().catch(() => {})
  // The intake hands over to the chat once the plan request is queued.
  await expect(page.getByText('Here is what I am working with:')).toBeVisible({ timeout: 30000 })
}
