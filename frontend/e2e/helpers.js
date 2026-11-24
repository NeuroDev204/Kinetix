// Virtual authenticator first, so `navigator.credentials` answers without a real device.
// The first-run tour prompt covers the screen on a new profile; Skip it so a test reaches its own screens.
async function skipTour(page) {
  const skip = page.getByRole('button', { name: 'Skip', exact: true })
  await skip.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {})
  if (await skip.isVisible().catch(() => false)) await skip.click()
}

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
  await skipTour(page)
}

// The Coach consent sheet: "Allow" the first time it shows, nothing if it is not on screen.
export async function agreeCoach(page) {
  const allow = page.getByRole('button', { name: 'Allow', exact: true })
  // The sheet can arrive a moment after the screen it guards (the first AI request asks for it).
  await allow.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  if (await allow.isVisible().catch(() => false)) await allow.click()
}
