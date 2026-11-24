import { describe, it, expect } from 'vitest'
import { angleDeg, jointSeries, LM } from './angles.js'
import { countReps, summarize } from './reps.js'
import { jointFor } from './exercise-joints.js'

// A synthetic set: the knee swings between 170 and 80 degrees, one cycle per rep.
function frames(reps, noise = 0) {
  const out = []
  for (let i = 0; i <= reps * 40; i++) {
    const th = (i / 40) * 2 * Math.PI
    const deg = 125 + 45 * Math.cos(th) + noise * Math.sin(i * 7.3)
    const rad = (180 - deg) * Math.PI / 180   // the ankle sits at 180 - deg from straight down
    // Hip above, knee at the origin, ankle placed so the angle at the knee is `deg`.
    const lms = []
    lms[LM.lHip] = { x: 0, y: -1, visibility: 1 }
    lms[LM.lKnee] = { x: 0, y: 0, visibility: 1 }
    lms[LM.lAnkle] = { x: Math.sin(rad), y: Math.cos(rad), visibility: 1 }
    lms[LM.rHip] = lms[LM.lHip]; lms[LM.rKnee] = lms[LM.lKnee]; lms[LM.rAnkle] = lms[LM.lAnkle]
    out.push({ t: i * 100, landmarks: lms })
  }
  return out
}

describe('joint angles and reps', () => {
  it('a right angle is 90 degrees', () => {
    expect(angleDeg({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90)
  })

  it('five cycles of the knee are five reps', () => {
    expect(countReps(jointSeries(frames(5), 'knee'))).toHaveLength(5)
  })

  it('a wobble of ±10 degrees adds no reps', () => {
    expect(countReps(jointSeries(frames(5, 10), 'knee'))).toHaveLength(5)
  })

  it('a joint with no visible landmarks gives no series', () => {
    const f = frames(1).map(x => ({ ...x, landmarks: [] }))
    expect(jointSeries(f, 'knee')).toEqual([])
  })

  it('the summary counts reps and reports each rep range', () => {
    const s = summarize(frames(5), 'knee')
    expect(s.reps).toBe(5)
    expect(s.perRep[0].minDeg).toBeLessThanOrEqual(85)
    expect(s.perRep[0].maxDeg).toBeGreaterThanOrEqual(165)
  })

  it('a squat maps to the knee and an unmapped exercise to nothing', () => {
    expect(jointFor('3593')).toBe('knee')
    expect(jointFor('9999')).toBe(null)
  })
})
