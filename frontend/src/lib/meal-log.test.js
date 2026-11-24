// @vitest-environment happy-dom
// Meal log: the state changes a meal photo goes through, and the one place a meal is analysed.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addMeal, applyMealResult, failMeal, setItemGrams, removeMeal, analyseMeal } from './meal-log.js'

const REF = { hash: 'a'.repeat(64), mime: 'image/jpeg' }
const NOW = Date.parse('2026-11-24T10:00:00Z')

const mocks = vi.hoisted(() => ({ syncMedia: vi.fn(), requestMeal: vi.fn() }))
vi.mock('./media-sync.js', () => ({ syncMedia: (...a) => mocks.syncMedia(...a) }))
vi.mock('./coach-api.js', () => ({ requestMeal: (...a) => mocks.requestMeal(...a) }))

const conflict = () => Object.assign(new Error('media-missing'), { status: 409, data: { error: 'media-missing' } })

describe('meal log state', () => {
  it('adds a pending meal for today with the photo ref', () => {
    const S = { meals: {} }
    const id = addMeal(S, REF, NOW)
    expect(S.meals[id]).toMatchObject({ d: expect.any(String), at: NOW, m: REF, items: [], status: 'pending', edited: false, _ts: NOW })
  })

  it('a result fills in the dishes and marks the meal done; a failure marks it failed', () => {
    const S = { meals: {} }
    const id = addMeal(S, REF, NOW)
    applyMealResult(S, id, { items: [{ name: 'rice', grams: 200, kcal: 260, protein: 5, carbs: 57, fat: 1 }], note: undefined })
    expect(S.meals[id].status).toBe('done')
    expect(S.meals[id].items[0].name).toBe('rice')
    failMeal(S, id, 'quota')
    expect(S.meals[id].status).toBe('failed')
  })

  it('changing grams rescales the dish and marks the meal edited', () => {
    const S = { meals: {} }
    const id = addMeal(S, REF, NOW)
    applyMealResult(S, id, { items: [{ name: 'rice', grams: 200, kcal: 260, protein: 5, carbs: 57, fat: 1 }] })
    setItemGrams(S, id, 0, 100)
    expect(S.meals[id].items[0]).toMatchObject({ grams: 100, kcal: 130 })
    expect(S.meals[id].edited).toBe(true)
  })

  it('removing a meal leaves a tombstone that a later merge can keep', () => {
    const S = { meals: {} }
    const id = addMeal(S, REF, NOW)
    removeMeal(S, id, NOW + 5)
    expect(S.meals[id]).toEqual({ _ts: NOW + 5 })
  })
})

describe('analyseMeal', () => {
  beforeEach(() => { mocks.syncMedia.mockReset().mockResolvedValue(undefined); mocks.requestMeal.mockReset() })

  it('syncs the photo, asks for the estimate, and reports done', async () => {
    mocks.requestMeal.mockResolvedValue({ id: 'job-1' })
    expect(await analyseMeal('m1', REF)).toBe('done')
    expect(mocks.syncMedia).toHaveBeenCalledWith({ force: true })
    expect(mocks.requestMeal).toHaveBeenCalledWith('m1', REF)
  })

  it('on a 409 it syncs again and retries once', async () => {
    mocks.requestMeal.mockRejectedValueOnce(conflict()).mockResolvedValueOnce({ id: 'job-2' })
    expect(await analyseMeal('m1', REF)).toBe('done')
    expect(mocks.syncMedia).toHaveBeenCalledTimes(2)
    expect(mocks.requestMeal).toHaveBeenCalledTimes(2)
  })

  it('a 409 that stays is offline: the meal stays pending for later', async () => {
    mocks.requestMeal.mockRejectedValue(conflict())
    expect(await analyseMeal('m1', REF)).toBe('offline')
    expect(mocks.requestMeal).toHaveBeenCalledTimes(2)
  })
})
