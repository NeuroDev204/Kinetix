// @vitest-environment happy-dom
// Kinetix intake: the body facts, the starting target, and the optional body photo that goes to
// the physique estimate. The rest of the intake is pinned in CoachIntake.test.jsx.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import CoachIntake from './CoachIntake.jsx'
import { requestPhysique, requestPlan } from '../lib/coach-api.js'
import { syncMedia } from '../lib/media-sync.js'
import { CONSENT_VERSION } from '../lib/coach.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: null, user: null, config: null, search: '', nav: vi.fn(), toast: vi.fn() }
  state.snapshot = () => ({ S: state.S, user: state.user, config: state.config, coachLocal: null, ready: true,
    refreshConfig: async () => state.config, update: mut => mut(state.S) })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.snapshot()) : mocks.snapshot()
  useStore.getState = mocks.snapshot
  return { useStore }
})
vi.mock('../store/useUI.js', () => {
  const snap = () => ({ toast: (...a) => mocks.toast(...a), openSheet: vi.fn() })
  const useUI = selector => selector ? selector(snap()) : snap()
  useUI.getState = snap
  return { useUI }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.nav, useSearchParams: () => [new URLSearchParams(''), vi.fn()] }))
vi.mock('../lib/coach-api.js', () => ({
  requestPlan: vi.fn(() => Promise.resolve({})),
  requestPhysique: vi.fn(() => Promise.resolve({ id: 'job-1' })),
  disclosure: vi.fn(() => Promise.resolve(null)),
  JOB_ERRORS: {},
  ensureAiConsent: vi.fn(() => Promise.resolve(true)),
  coachVia: () => 'server',
  isDeclined: e => e?.code === 'declined',
}))
vi.mock('../lib/media-sync.js', () => ({ syncMedia: vi.fn(() => Promise.resolve()) }))
vi.mock('../components/CustomMediaField.jsx', () => ({
  useMediaPicker: () => ({ pick: async () => ({ hash: 'a'.repeat(64), mime: 'image/jpeg' }) }),
}))
vi.mock('../coach.css', () => ({}))

let host, root
beforeEach(() => {
  mocks.S = { unit: 'kg', lang: 'en', customEx: [], workouts: [], bodyweight: [], exWeights: {}, dayPlan: {}, routines: [], week: {},
    // Consent given, four training days already on the profile: the target uses 4 days a week.
    coach: { consent: { agreedAt: '2026-09-01T00:00:00Z', version: CONSENT_VERSION }, profile: { daysPerWeek: 4 }, chat: [] } }
  mocks.user = { uid: 'u1', name: 'Ana' }
  mocks.config = { coach: { enabled: true } }
  mocks.nav.mockReset(); mocks.toast.mockReset()
  vi.mocked(requestPlan).mockClear(); vi.mocked(requestPhysique).mockClear(); vi.mocked(syncMedia).mockClear()
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const mount = () => act(() => root.render(<CoachIntake />))
const settle = async () => { await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve() }) }
const eyebrow = () => host.querySelector('.ob-eyebrow')?.textContent
const footBtn = () => host.querySelector('.ob-foot .btn')
const cont = () => act(() => footBtn().click())
const tapFirst = sel => act(() => host.querySelector(sel).click())
const typeIn = (el, value) => act(() => {
  Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
const fieldOf = label => [...host.querySelectorAll('label.ob-field')].find(l => l.textContent.startsWith(label))?.querySelector('input')

describe('Kinetix intake — body facts and the starting target', () => {
  it('the body and photo screens come right after the goal', () => {
    mount()
    tapFirst('.ob-choice')          // the first goal
    cont()
    expect(eyebrow()).toBe('Your body')
    expect(footBtn().disabled).toBe(true)
  })

  it('the body photo is skippable', () => {
    mount()
    tapFirst('.ob-choice'); cont()
    tapFirst('.ob-choice')         // male
    typeIn(fieldOf('Birth year'), String(new Date().getFullYear() - 25))
    typeIn(fieldOf('Height'), '175'); typeIn(fieldOf('Weight'), '70'); typeIn(fieldOf('Goal weight'), '65')
    cont()
    expect(eyebrow()).toBe('Body photo')
    expect(footBtn().disabled).toBe(false)
  })

  it('finishing writes the body facts and the starting target from them', async () => {
    mount()
    tapFirst('.ob-choice'); cont()
    tapFirst('.ob-choice'); typeIn(fieldOf('Birth year'), String(new Date().getFullYear() - 25))
    typeIn(fieldOf('Height'), '175'); typeIn(fieldOf('Weight'), '70'); typeIn(fieldOf('Goal weight'), '65')
    cont(); cont()                  // photo skipped, then experience
    tapFirst('.ob-choice'); cont()  // experience
    cont()                          // days (4 already on the profile)
    cont(); cont(); cont()          // length, equipment, limits
    await act(async () => { footBtn().click() })
    await settle()
    expect(mocks.S.heightCm).toBe(175)
    expect(mocks.S.targetW).toBe(65)
    expect(mocks.S.nutritionPlan.kcal).toBe(1961)
    expect(mocks.S.nutritionPlan.why).toBe('initial')
  })

  it('a body photo is synced and sent once for the estimate', async () => {
    mount()
    tapFirst('.ob-choice'); cont()
    tapFirst('.ob-choice'); typeIn(fieldOf('Birth year'), String(new Date().getFullYear() - 25))
    typeIn(fieldOf('Height'), '175'); typeIn(fieldOf('Weight'), '70'); typeIn(fieldOf('Goal weight'), '65')
    cont()
    const input = host.querySelector('input[type="file"][capture]')
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'body.jpg', { type: 'image/jpeg' })], configurable: true })
    await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    await settle()
    expect(syncMedia).toHaveBeenCalledTimes(1)
    expect(requestPhysique).toHaveBeenCalledTimes(1)
    expect(requestPhysique.mock.calls[0][0]).toMatchObject({ hash: 'a'.repeat(64) })
    expect(requestPhysique.mock.calls[0][1]).toMatchObject({ sex: 'm', heightCm: 175, weightKg: 70, goalKg: 65 })
  })
})
