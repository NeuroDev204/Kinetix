// Kinetix nutrition math: calorie needs, the starting target, scaling a logged item, and a day's
// totals. Pure: no store, no clock except where a `now` is passed in.

/** Basal metabolic rate, Mifflin-St Jeor, kcal per day. */
export function bmr({ sex, kg, cm, age }) {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'm' ? 5 : -161)
}

/** Total daily energy expenditure for a training week, activity factor capped at 1.725. */
export function tdee(bmrKcal, daysPerWeek) {
  return bmrKcal * Math.min(1.2 + 0.075 * daysPerWeek, 1.725)
}

/** Starting target: TDEE plus the weekly rate (kg per week, negative = lose), 7700 kcal per kg. */
export function initialTarget({ sex, kg, cm, age, daysPerWeek, rateGoal }) {
  const base = tdee(bmr({ sex, kg, cm, age }), daysPerWeek)
  const kcal = Math.min(5000, Math.max(1200, Math.round(base + rateGoal * 7700 / 7)))
  const protein = Math.round(1.8 * kg)
  const fat = Math.round(kcal * 0.25 / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat }
}

const r1 = v => Math.round(v * 10) / 10

/** A logged food item's macros for `grams`, scaled from the item's own `grams`. */
export function scaleItem(item, grams) {
  const f = grams > 0 && item.grams > 0 ? grams / item.grams : 0
  return { ...item, grams, kcal: r1(item.kcal * f), protein: r1(item.protein * f), carbs: r1(item.carbs * f), fat: r1(item.fat * f) }
}

/** The live meals of one day, earliest first. Tombstones ({ _ts } only) are not meals. */
export function mealsOn(S, d) {
  return Object.entries(S.meals || {})
    .filter(([, m]) => m && m.d === d)
    .map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => (a.at || 0) - (b.at || 0))
}

/** The day's macro totals, one decimal. */
export function dayTotals(S, d) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  for (const m of mealsOn(S, d)) for (const it of m.items || []) {
    t.kcal += it.kcal || 0; t.protein += it.protein || 0; t.carbs += it.carbs || 0; t.fat += it.fat || 0
  }
  return { kcal: r1(t.kcal), protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat) }
}

/** Age in whole years from a birth year. */
export function ageOf(birthYear, now = Date.now()) {
  return new Date(now).getFullYear() - birthYear
}
