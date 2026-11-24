// The tools the live trainer can call during a workout. The pure part (logNextSet) decides which
// set a spoken log lands on; the workout view supplies the handlers that actually change the session.
export const TOOL_DECLARATIONS = [
  { name: 'log_set', description: 'Log the weight and reps of the next open set, or of a named exercise, and tick it.', parameters: { type: 'OBJECT', properties: { exercise: { type: 'STRING' }, weight: { type: 'NUMBER' }, reps: { type: 'INTEGER' } } } },
  { name: 'start_rest', description: 'Start the rest timer for some seconds (15 to 600).', parameters: { type: 'OBJECT', properties: { seconds: { type: 'INTEGER' } }, required: ['seconds'] } },
  { name: 'next_exercise', description: 'Move on to the next exercise.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'get_today', description: "Summarise today's session: exercises, sets done, and the next set's target.", parameters: { type: 'OBJECT', properties: {} } },
]

/**
 * Which set a logged set lands on. `entries` is the session's exercises with their sets ({ w, r,
 * done }); a named exercise matches by name, else the first exercise with an open set. Returns
 * { ok, idx, i, exercise, set, weight, reps } or { ok: false, error }.
 */
export function logNextSet(entries, { exercise, weight, reps } = {}) {
  const list = Array.isArray(entries) ? entries : []
  let idx = -1
  if (exercise) {
    const want = String(exercise).trim().toLowerCase()
    idx = list.findIndex(e => String(e?.name || '').toLowerCase() === want)
    if (idx < 0) return { ok: false, error: "not in today's session" }
  } else {
    idx = list.findIndex(e => (e?.sets || []).some(s => !s?.done))
    if (idx < 0) return { ok: false, error: 'no open set' }
  }
  const sets = list[idx].sets || []
  const i = sets.findIndex(s => !s?.done)
  if (i < 0) return { ok: false, error: 'no open set for that exercise' }
  return {
    ok: true, idx, i, exercise: list[idx].name || '', set: i + 1,
    weight: weight != null ? Number(weight) : sets[i].w ?? null,
    reps: reps != null ? Number(reps) : sets[i].r ?? null,
  }
}

let handlers = null
/** The workout view binds its handlers while it is on screen; tool calls are refused otherwise. */
export function bindVoiceActions(h) {
  handlers = h
  return () => { if (handlers === h) handlers = null }
}

/** Runs one tool call and returns what the model is told. */
export async function handleToolCall({ name, args = {} } = {}) {
  if (!handlers) return { ok: false, error: 'no workout is open' }
  if (name === 'log_set') return handlers.logSet(args)
  if (name === 'start_rest') {
    const s = Number(args.seconds)
    if (!Number.isInteger(s) || s < 15 || s > 600) return { ok: false, error: 'seconds 15-600' }
    handlers.startRest(s)
    return { ok: true, seconds: s }
  }
  if (name === 'next_exercise') { handlers.nextExercise(); return { ok: true } }
  if (name === 'get_today') return handlers.today()
  return { ok: false, error: 'unknown tool' }
}
