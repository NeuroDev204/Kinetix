// Joint angles from pose landmarks, and the series a set's frames make of them. Pure.

/** Angle at `b` between b→a and b→c, in degrees. */
export function angleDeg(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const n = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)
  if (!n) return 0
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / n))
  return Math.acos(cos) * 180 / Math.PI
}

/** MediaPipe pose landmark indices. */
export const LM = { lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 }

// The three landmarks each joint's angle is measured through, per side: [a, vertex, c].
const JOINT = {
  knee: { l: [LM.lHip, LM.lKnee, LM.lAnkle], r: [LM.rHip, LM.rKnee, LM.rAnkle] },
  hip: { l: [LM.lShoulder, LM.lHip, LM.lKnee], r: [LM.rShoulder, LM.rHip, LM.rKnee] },
  elbow: { l: [LM.lShoulder, LM.lElbow, LM.lWrist], r: [LM.rShoulder, LM.rElbow, LM.rWrist] },
  shoulder: { l: [LM.lHip, LM.lShoulder, LM.lElbow], r: [LM.rHip, LM.rShoulder, LM.rElbow] },
}
const VISIBLE = 0.5

const sideDeg = (lms, [a, b, c]) => {
  const pa = lms[a], pb = lms[b], pc = lms[c]
  if (!pa || !pb || !pc) return null
  if ((pa.visibility ?? 1) < VISIBLE || (pb.visibility ?? 1) < VISIBLE || (pc.visibility ?? 1) < VISIBLE) return null
  return angleDeg(pa, pb, pc)
}

/** One angle per frame for `joint`: the mean of both sides when both are seen, else the one seen. */
export function jointSeries(frames, joint) {
  const j = JOINT[joint]
  if (!j) return []
  const out = []
  for (const f of frames) {
    const lms = f.landmarks || []
    const l = sideDeg(lms, j.l), r = sideDeg(lms, j.r)
    const deg = l != null && r != null ? (l + r) / 2 : l ?? r
    if (deg != null) out.push({ t: f.t, deg })
  }
  return out
}

/** Turning points of a series: a point is kept when the value turns back by at least `h`. */
function turningPoints(series, h) {
  const tps = []
  if (series.length < 2) return tps
  let cand = series[0], dir = 0
  for (const p of series.slice(1)) {
    if (dir === 0) {
      if (Math.abs(p.deg - cand.deg) >= h) {
        dir = Math.sign(p.deg - cand.deg)
        tps.push({ ...series[0], kind: dir < 0 ? 'max' : 'min' })
        cand = p
      }
      continue
    }
    if ((p.deg - cand.deg) * dir >= 0) cand = p
    else if ((cand.deg - p.deg) * dir >= h) {
      tps.push({ ...cand, kind: dir > 0 ? 'max' : 'min' })
      dir = -dir
      cand = p
    }
  }
  if (dir !== 0) tps.push({ ...cand, kind: dir > 0 ? 'max' : 'min' })
  return tps
}

/** Torso lean from vertical, per frame (degrees), from the hip-to-shoulder line. */
function trunkLeanMax(frames) {
  let best = null
  for (const f of frames) {
    const lms = f.landmarks || []
    const sh = [lms[LM.lShoulder], lms[LM.rShoulder]].filter(p => p && (p.visibility ?? 1) >= VISIBLE)
    const hp = [lms[LM.lHip], lms[LM.rHip]].filter(p => p && (p.visibility ?? 1) >= VISIBLE)
    if (!sh.length || !hp.length) continue
    const s = { x: sh.reduce((a, p) => a + p.x, 0) / sh.length, y: sh.reduce((a, p) => a + p.y, 0) / sh.length }
    const h = { x: hp.reduce((a, p) => a + p.x, 0) / hp.length, y: hp.reduce((a, p) => a + p.y, 0) / hp.length }
    const lean = angleDeg({ x: s.x, y: s.y - 1 }, h, s)
    if (best == null || lean > best) best = lean
  }
  return best
}

export { turningPoints, trunkLeanMax }
