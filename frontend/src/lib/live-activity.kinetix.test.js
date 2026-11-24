// Kinetix ships without a Live Activity on iOS: the plugin is not reached there, so nothing is
// requested from the widget target a free team cannot sign. Android keeps its card.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const plat = vi.hoisted(() => ({ value: 'ios' }))
vi.mock('./mobile.js', () => ({ MOBILE: true, nativePlatform: async () => plat.value }))
vi.mock('@capacitor/core', () => ({ registerPlugin: () => ({ status: async () => ({ supported: true }) }) }))

beforeEach(() => { vi.resetModules() })

describe('Live Activity on iOS', () => {
  it('the iOS plugin resolves to nothing', async () => {
    plat.value = 'ios'
    const { liveStatus } = await import('./live-activity.js')
    expect((await liveStatus()).native).toBe(false)
  })

  it('Android keeps its card', async () => {
    plat.value = 'android'
    const { liveStatus } = await import('./live-activity.js')
    expect((await liveStatus()).native).toBe(true)
  })
})
