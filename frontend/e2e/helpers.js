// Virtual authenticator first, so `navigator.credentials` answers without a real device.
export async function signIn(page, baseURL) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true },
  })
  await page.goto(baseURL)
  await page.getByRole('button', { name: 'Create new profile' }).click()
  await page.getByPlaceholder('Your name').fill('E2E User')
  await page.getByRole('button', { name: 'Create passkey' }).click()
}

// The Coach consent sheet: "Allow" the first time it shows, nothing if it is not on screen.
export async function agreeCoach(page) {
  const allow = page.getByRole('button', { name: 'Allow', exact: true })
  if (await allow.isVisible().catch(() => false)) await allow.click()
}
