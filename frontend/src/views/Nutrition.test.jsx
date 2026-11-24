// @vitest-environment happy-dom
// The nutrition screen: today's target and totals, a meal with no food in it says so, and a meal
// still waiting for the server says that too.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Nutrition from './Nutrition.jsx'

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
vi.mock('../components/CustomMediaField.jsx', () => ({ useMediaPicker: () => ({ pick: async () => null, busy: false }) }))
vi.mock('../lib/meal-log.js', async orig => ({ ...(await orig()), analyseMeal: vi.fn(async () => 'done') }))
vi.mock('./Nutrition.css', () => ({}))

let host, root
const today = () => new Date().toISOString().slice(0, 10)
beforeEach(() => {
  const d = today()
  mocks.S = {
    nutritionPlan: { kcal: 1961, protein: 126, carbs: 243, fat: 54, why: 'initial', mealPlan: [], at: 1 },
    meals: {
      done: { d, at: Date.parse(d + 'T08:00:00'), m: { hash: 'a'.repeat(64) }, items: [], status: 'done', edited: false, _ts: 1 },
      wait: { d, at: Date.parse(d + 'T12:00:00'), m: { hash: 'b'.repeat(64) }, items: [{ name: 'rice', grams: 200, kcal: 260, protein: 5, carbs: 57, fat: 1 }], status: 'pending', edited: false, _ts: 2 },
    },
  }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('Nutrition screen', () => {
  it('shows today’s target and what the meals add up to', () => {
    act(() => root.render(<Nutrition />))
    expect(host.querySelector('.nutr-kcal').textContent).toContain('1961')
    expect(host.querySelector('.nutr-kcal b').textContent).toBe('260')
  })

  it('a meal with no food says so', () => {
    act(() => root.render(<Nutrition />))
    expect(host.textContent).toContain('No food found in this photo')
  })

  it('a meal the server has not analysed yet says it will analyse when online', () => {
    act(() => root.render(<Nutrition />))
    expect(host.textContent).toContain('Will analyse when online')
  })
})
