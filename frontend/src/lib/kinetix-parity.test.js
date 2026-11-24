// The phone's day totals (lib/nutrition.js dayTotals) and the server's copy (api/coach/core/payload.js
// dailyMacros) must sum the same meals the same way. The review's numbers come from the server.
import { describe, it, expect } from 'vitest'
import { dayTotals } from './nutrition.js'
import { dailyMacros } from '../../../api/coach/core/payload.js'

const S = {
  meals: {
    a: { d: '2026-11-20', at: 1, items: [{ name: 'rice', grams: 200, kcal: 260.4, protein: 5.4, carbs: 57, fat: 0.6 }, { name: 'egg', grams: 50, kcal: 78, protein: 6, carbs: 0.6, fat: 5 }] },
    b: { d: '2026-11-20', at: 2, items: [{ name: 'chicken', grams: 150, kcal: 250, protein: 46, carbs: 0, fat: 5.5 }] },
    c: { d: '2026-11-21', at: 3, items: [{ name: 'oats', grams: 60, kcal: 230, protein: 8, carbs: 40, fat: 4 }] },
    gone: { _ts: 99 },
  },
}

describe('phone and server agree on a day', () => {
  it('the same totals for the same meals', () => {
    const server = dailyMacros(S, '2026-11-20', '2026-11-21')
    for (const row of server) {
      const phone = dayTotals(S, row.d)
      expect(phone).toEqual({ kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat })
    }
  })
})
