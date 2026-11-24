import { test, expect } from '@playwright/test'
import { startStack } from './stack.js'
import { signIn } from './helpers.js'

let stack
test.beforeAll(async () => { stack = await startStack() })
test.afterAll(async () => { await stack?.stop() })

test('signs in with a virtual passkey and shows the Kinetix tab bar', async ({ page }) => {
  await signIn(page, stack.baseURL)
  await expect(page).toHaveTitle(/Kinetix/)
  await expect(page.locator('#tabbar')).toBeVisible()
})
