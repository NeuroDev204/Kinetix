import { describe, it, expect } from 'vitest'
import { bmr, tdee, initialTarget, scaleItem, mealsOn, dayTotals, ageOf } from './nutrition.js'

describe('nutrition math', () => {
  it('BMR is Mifflin-St Jeor', () => {
    expect(bmr({ sex: 'm', kg: 70, cm: 175, age: 25 })).toBe(1673.75)
    expect(bmr({ sex: 'f', kg: 60, cm: 165, age: 30 })).toBe(1320.25)
  })

  it('TDEE scales with training days and caps at 1.725', () => {
    expect(tdee(1673.75, 4)).toBe(2510.625)
    expect(tdee(1000, 7)).toBe(1725)
  })

  it('initial target: calories from TDEE and rate, protein 1.8 g/kg, fat 25%, carbs the rest', () => {
    expect(initialTarget({ sex: 'm', kg: 70, cm: 175, age: 25, daysPerWeek: 4, rateGoal: -0.5 }))
      .toEqual({ kcal: 1961, protein: 126, fat: 54, carbs: 243 })
  })

  it('initial target clamps calories to 1200-5000', () => {
    expect(initialTarget({ sex: 'f', kg: 45, cm: 150, age: 60, daysPerWeek: 1, rateGoal: -1 }).kcal).toBe(1200)
  })

  it('scaleItem scales macros by grams and rounds to one decimal', () => {
    const item = { name: 'cơm', grams: 200, kcal: 260, protein: 5.4, carbs: 57, fat: 0.6 }
    const half = scaleItem(item, 100)
    expect(half.kcal).toBe(130)
    expect(half.grams).toBe(100)
    expect(scaleItem(item, 0)).toMatchObject({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })

  it('mealsOn returns live meals of the day sorted by time; dayTotals ignores tombstones and other days', () => {
    const m = (d, at, kcal, extra = {}) => ({ d, at, _ts: at, items: [{ name: 'x', grams: 100, kcal, protein: 10, carbs: 20, fat: 5 }], ...extra })
    const S = { meals: {
      a: m('2026-11-24', 200, 300),
      b: m('2026-11-24', 100, 200),
      gone: { _ts: 999 },
      other: m('2026-11-23', 50, 999),
    } }
    expect(mealsOn(S, '2026-11-24').map(x => x.id)).toEqual(['b', 'a'])
    expect(dayTotals(S, '2026-11-24')).toEqual({ kcal: 500, protein: 20, carbs: 40, fat: 10 })
  })

  it('ageOf counts whole years from a birth year', () => {
    expect(ageOf(2000, new Date('2026-11-24').getTime())).toBe(26)
  })
})
