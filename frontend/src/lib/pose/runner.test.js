// @vitest-environment happy-dom
// The pose runner with MediaPipe replaced: GPU then CPU, no library load for an unmapped exercise,
// landmarks reach the summary, and the dev fixture bypasses MediaPipe.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mp = vi.hoisted(() => ({ gpuFails: false, created: [], imported: 0 }))
vi.mock('@mediapipe/tasks-vision', () => {
  mp.imported++
  return {
    FilesetResolver: { forVisionTasks: async () => ({}) },
    PoseLandmarker: {
      createFromOptions: async (_v, opts) => {
        if (opts.baseOptions.delegate === 'GPU' && mp.gpuFails) throw new Error('no gpu')
        mp.created.push(opts.baseOptions.delegate)
        return { detectForVideo: () => ({ landmarks: [[]] }), close: () => {} }
      },
    },
  }
})

import { analyzeVideo, createLandmarker, sampleFrames } from './runner.js'
import { LM } from './angles.js'

beforeEach(() => { mp.gpuFails = false; mp.created = []; mp.imported = 0 })
afterEach(() => { delete window.__KINETIX_POSE_FIXTURE__ })

describe('pose runner', () => {
  it('an exercise with no joint returns null without loading the library', async () => {
    expect(await analyzeVideo(new Blob(['x']), { exerciseId: '9999' })).toEqual({ joint: null })
    expect(mp.imported).toBe(0)
  })

  it('a GPU that will not start falls back to the CPU', async () => {
    mp.gpuFails = true
    await createLandmarker({ createFromOptions: (v, o) => import('@mediapipe/tasks-vision').then(m => m.PoseLandmarker.createFromOptions(v, o)) }, {})
    expect(mp.created).toEqual(['CPU'])
  })

  it('landmarks from each frame reach the summary', async () => {
    const lms = []
    lms[LM.lHip] = { x: 0, y: -1, visibility: 1 }; lms[LM.lKnee] = { x: 0, y: 0, visibility: 1 }; lms[LM.lAnkle] = { x: 0, y: 1, visibility: 1 }
    const video = { duration: 0.2 }
    const seekable = Object.assign(new EventTarget(), video)
    seekable.duration = 0.2
    Object.defineProperty(seekable, 'currentTime', { set(t) { queueMicrotask(() => seekable.dispatchEvent(new Event('seeked'))) }, get() { return 0 } })
    const frames = await sampleFrames(seekable, () => ({ landmarks: [lms] }), { fps: 10 })
    expect(frames).toHaveLength(2)
    expect(frames[0].landmarks[LM.lKnee]).toEqual(lms[LM.lKnee])
    expect(frames[1].t).toBe(100)
  })

  it('the dev fixture is used instead of MediaPipe', async () => {
    window.__KINETIX_POSE_FIXTURE__ = Array.from({ length: 4 }, (_, i) => ({ t: i * 100, landmarks: [] }))
    const r = await analyzeVideo(new Blob(['x']), { exerciseId: '3593' })
    expect(r.joint).toBe('knee')
    expect(r.frames).toHaveLength(4)
    expect(mp.imported).toBe(0)
  })
})
