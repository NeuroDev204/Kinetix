// Counting reps from a joint series: a rep is a top, a bottom and a top again, with the swing from
// the bottom to each top at least `minRange` degrees. The turn counts only once the value has come
// back `minRange / 2` (hysteresis), so small wobble does not make reps. Pure.
import { turningPoints, trunkLeanMax } from './angles.js'
import { jointSeries } from './angles.js'

export function countReps(series, { minRange = 40 } = {}) {
  const tps = turningPoints(series, minRange / 2)
  const reps = []
  for (let i = 0; i + 2 < tps.length; i++) {
    const [top1, bottom, top2] = [tps[i], tps[i + 1], tps[i + 2]]
    if (top1.kind !== 'max' || bottom.kind !== 'min' || top2.kind !== 'max') continue
    const swing = Math.min(top1.deg, top2.deg) - bottom.deg
    if (swing < minRange) continue
    reps.push({ start: top1.t, bottom: bottom.t, end: top2.t, minDeg: bottom.deg, maxDeg: Math.max(top1.deg, top2.deg) })
    i += 1
  }
  return reps
}

/** Reps, each rep's range and duration, and the most the torso leaned, for one joint over a set. */
export function summarize(frames, joint, opts = {}) {
  const series = jointSeries(frames, joint)
  const reps = countReps(series, opts)
  return {
    reps: reps.length,
    perRep: reps.map(r => ({ minDeg: Math.round(r.minDeg), maxDeg: Math.round(r.maxDeg), durationMs: r.end - r.start })),
    trunkLeanMaxDeg: trunkLeanMax(frames) == null ? null : Math.round(trunkLeanMax(frames)),
  }
}
