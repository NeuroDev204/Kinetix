// Kinetix meal log: the state a meal photo goes through (pending, done, failed), grams edits, and
// the one place a meal is sent for analysis. The result of the job arrives later as a pending
// proposal; applyMealResult writes it into the meal when the app takes it.
import { scaleItem } from './nutrition.js'
import { syncMedia } from './media-sync.js'
import { requestMeal } from './coach-api.js'

const dayOf = now => {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A new pending meal for the day of `now`. Returns its id. */
export function addMeal(S, ref, now = Date.now()) {
  const id = `${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`
  S.meals = S.meals || {}
  S.meals[id] = { d: dayOf(now), at: now, m: ref, items: [], status: 'pending', edited: false, _ts: now }
  return id
}

/** The dishes the Coach found; an empty list keeps its note so the screen can say why. */
export function applyMealResult(S, id, { items = [], note } = {}) {
  const m = S.meals?.[id]
  if (!m) return
  m.items = items
  m.status = 'done'
  if (note) m.note = note
  else delete m.note
}

export function failMeal(S, id, errorClass) {
  const m = S.meals?.[id]
  if (!m) return
  m.status = 'failed'
  m.errorClass = errorClass || null
}

/** Changing a dish's grams rescales its macros and marks the meal as the person's own edit. */
export function setItemGrams(S, id, index, grams) {
  const m = S.meals?.[id]
  if (!m || !m.items[index]) return
  m.items[index] = scaleItem(m.items[index], grams)
  m.edited = true
}

/** A tombstone, so a merge on another device keeps the meal removed. */
export function removeMeal(S, id, now = Date.now()) {
  if (S.meals) S.meals[id] = { _ts: now }
}

const isMediaMissing = e => e?.status === 409 || e?.data?.error === 'media-missing'

/**
 * Sends the photo for analysis. 'done' when the job is queued (the dishes arrive later), 'offline'
 * when the server still does not have the photo after a second sync (the meal stays pending),
 * 'failed' for anything else.
 */
export async function analyseMeal(id, ref) {
  await syncMedia({ force: true })
  try { await requestMeal(id, ref); return 'done' } catch (e) {
    if (!isMediaMissing(e)) return 'failed'
  }
  await syncMedia({ force: true })
  try { await requestMeal(id, ref); return 'done' } catch (e) {
    return isMediaMissing(e) ? 'offline' : 'failed'
  }
}
