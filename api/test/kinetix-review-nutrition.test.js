// The weekly review can move the calorie target and the meal plan. The payload shows it the last
// fourteen days of meals, the target and the weight trend; the answer is checked before it is kept.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyMacros, buildNutritionForReview } from '../coach/core/payload.js';
import { validateReview } from '../coach/core/validate.js';
import { REVIEW_SCHEMA } from '../coach/core/schemas.js';

const meal = (d, kcal, extra = {}) => ({ d, at: Date.parse(d + 'T12:00:00Z'), _ts: 1, items: [{ name: 'x', grams: 100, kcal, protein: 10, carbs: 20, fat: 5 }], ...extra });

test('fourteen days of meals, one entry per day, zero on a day without meals', () => {
  const S = { meals: { a: meal('2026-11-20', 500), b: meal('2026-11-20', 300), c: meal('2026-11-22', 700), gone: { _ts: 9 } } };
  const days = dailyMacros(S, '2026-11-18', '2026-12-01');
  assert.equal(days.length, 14);
  assert.deepEqual(days.find(x => x.d === '2026-11-20'), { d: '2026-11-20', kcal: 800, protein: 20, carbs: 40, fat: 10, meals: 2 });
  assert.equal(days.find(x => x.d === '2026-11-19').kcal, 0);
});

test('the review payload carries the target, the meals and a weight trend that falls', () => {
  const S = {
    nutritionPlan: { kcal: 1961, protein: 126, carbs: 243, fat: 54 },
    bodyweight: [
      { d: '2026-11-11', w: 71 }, { d: '2026-11-14', w: 70.5 }, { d: '2026-11-17', w: 70 }, { d: '2026-11-20', w: 69.5 },
    ],
    meals: { a: meal('2026-11-20', 500) },
  };
  const now = Date.parse('2026-11-24T12:00:00Z');
  const block = buildNutritionForReview(S, now);
  assert.equal(block.target.kcal, 1961);
  assert.equal(block.days.length, 14);
  assert.ok(block.trend14.perWeek < 0, 'a falling series has a negative trend');
  assert.equal(block.trend14.n, 4);
});

const base = {
  coach_contract: 1,
  summary: 'Eat a little less.',
  evidence: { from: '2026-11-17', to: '2026-11-24', sessions: 4 },
  changes: [],
};
const plan = { routines: [] };

test('a nutrition change inside the limits is kept with the review', () => {
  const r = validateReview({ ...base, nutrition: { kcal: 1850, protein: 130, carbs: 200, fat: 55, why: 'Weight is flat.', mealPlan: [{ day: 'Mon', meals: ['oats', 'chicken rice'] }] } }, plan);
  assert.equal(r.ok, true);
  assert.equal(r.proposal.nutrition.kcal, 1850);
});

test('a calorie target outside 1200-5000 is refused', () => {
  assert.equal(validateReview({ ...base, nutrition: { kcal: 900, protein: 130, carbs: 200, fat: 55, why: 'x', mealPlan: [] } }, plan).ok, false);
});

test('too many days or meals in the plan are refused', () => {
  const days = Array.from({ length: 8 }, (_, i) => ({ day: 'D' + i, meals: ['a'] }));
  assert.equal(validateReview({ ...base, nutrition: { kcal: 1800, protein: 130, carbs: 200, fat: 55, why: 'x', mealPlan: days } }, plan).ok, false);
});

test('the review schema offers the optional nutrition block', () => {
  assert.ok(REVIEW_SCHEMA.properties.nutrition);
});
