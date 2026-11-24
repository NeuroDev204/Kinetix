// @vitest-environment happy-dom
// The English page: a day with mistakes shows them with their fixes and the new words; with no
// practice yet it says so.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import English from './English.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const mocks = vi.hoisted(() => {
  const state = { S: null }
  state.snapshot = () => ({ S: state.S, update: mut => mut(state.S) })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.snapshot()) : mocks.snapshot()
  useStore.getState = mocks.snapshot
  return { useStore }
})
vi.mock('../lib/coach-api.js', () => ({
  requestEnglishSummary: vi.fn(async () => ({ id: 'j' })),
  coachStatus: vi.fn(async () => ({ job: null, pending: null, last: null })),
  resolvePending: vi.fn(async () => ({})),
}))
vi.mock('./Nutrition.css', () => ({}))

let host, root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host) })
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('English page', () => {
  it('says so when there is no practice yet', () => {
    mocks.S = { english: {} }
    act(() => root.render(<English />))
    expect(host.textContent).toContain('No English practice yet')
  })

  it('shows a day’s mistakes with their fixes and the new words', () => {
    mocks.S = { english: { '2026-11-24': { transcript: 'You: me go gym', mistakes: [{ said: 'me go gym', better: 'I go to the gym' }], newWords: ['gym'] } } }
    act(() => root.render(<English />))
    expect(host.textContent).toContain('I go to the gym')
    expect(host.textContent).toContain('New words: gym')
  })
})
