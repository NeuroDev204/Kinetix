// @vitest-environment happy-dom
// A review that changes the calorie target: applying it sets the plan, and Undo puts the previous
// plan back, exactly like the routines it changed alongside.
import { describe, it, expect } from 'vitest'
import { applyChangeSet, revertLast } from './coach.js'

const proposal = {
  id: 'p1',
  changes: [],
  nutrition: { kcal: 1850, protein: 130, carbs: 200, fat: 55, why: 'Weight is flat.', mealPlan: [{ day: 'Mon', meals: ['oats'] }] },
}
const state = (plan) => ({ routines: [], week: {}, nutritionPlan: plan, coach: { snapshots: [] } })

describe('a review that changes the nutrition plan', () => {
  it('applying it sets the plan and records the one it replaces', () => {
    const prev = { kcal: 1961, protein: 126, carbs: 243, fat: 54, why: 'initial', mealPlan: [], at: 1 }
    const S = state(prev)
    const res = applyChangeSet(S, proposal, ['nutrition'])
    expect(res.applied).toBe(0)                      // no training change was among them
    expect(S.nutritionPlan.kcal).toBe(1850)
    expect(S.nutritionPlan.why).toBe('Weight is flat.')
  })

  it('Undo restores the previous plan', () => {
    const prev = { kcal: 1961, protein: 126, carbs: 243, fat: 54, why: 'initial', mealPlan: [], at: 1 }
    const S = state(prev)
    applyChangeSet(S, proposal, ['nutrition'])
    expect(revertLast(S)).toBe(true)
    expect(S.nutritionPlan).toEqual(prev)
  })

  it('declining it leaves the plan alone', () => {
    const prev = { kcal: 1961, protein: 126, carbs: 243, fat: 54, why: 'initial', mealPlan: [], at: 1 }
    const S = state(prev)
    applyChangeSet(S, proposal, [])
    expect(S.nutritionPlan).toEqual(prev)
  })
})
