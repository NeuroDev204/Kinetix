// Runs MediaPipe pose on a set's video, a frame every 1/fps seconds, and summarises the joint the
// exercise is judged by. The library and the model load only when an exercise has a joint to count;
// a dev build can feed frames from window.__KINETIX_POSE_FIXTURE__ instead (the E2E runs use that).
import { jointFor } from './exercise-joints.js'
import { summarize } from './reps.js'

const MODEL = '/models/pose_landmarker_lite.task'

/** GPU first, CPU if the GPU cannot start. */
export async function createLandmarker(PoseLandmarker, vision) {
  const opts = delegate => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numPoses: 1 })
  try { return await PoseLandmarker.createFromOptions(vision, opts('GPU')) }
  catch { return PoseLandmarker.createFromOptions(vision, opts('CPU')) }
}

/** Walks the video in steps of 1/fps, seeking and detecting each frame, with increasing times. */
export async function sampleFrames(video, detect, { fps = 15, onProgress } = {}) {
  const duration = video.duration || 0
  const frames = []
  for (let t = 0; t < duration; t += 1 / fps) {
    await seek(video, t)
    const tMs = Math.round(t * 1000)
    const res = detect(video, tMs)
    frames.push({ t: tMs, landmarks: res?.landmarks?.[0] || [] })
    onProgress && onProgress(t / duration)
  }
  return frames
}

function seek(video, t) {
  return new Promise(resolve => {
    const done = () => { video.removeEventListener('seeked', done); resolve() }
    video.addEventListener('seeked', done)
    video.currentTime = t
  })
}

/** The set's joint series and summary, or { joint: null } when the exercise has no joint to count. */
export async function analyzeVideo(blob, { exerciseId, fps = 15, onProgress } = {}) {
  const joint = jointFor(exerciseId)
  if (!joint) return { joint: null }
  if (!import.meta.env.PROD && typeof window !== 'undefined' && window.__KINETIX_POSE_FIXTURE__) {
    const frames = window.__KINETIX_POSE_FIXTURE__
    return { joint, frames, summary: summarize(frames, joint) }
  }
  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
  const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
  const lm = await createLandmarker(PoseLandmarker, vision)
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.src = url
  await new Promise(r => { video.addEventListener('loadeddata', r, { once: true }); video.load() })
  try {
    const frames = await sampleFrames(video, (v, tMs) => lm.detectForVideo(v, tMs), { fps, onProgress })
    return { joint, frames, summary: summarize(frames, joint) }
  } finally {
    lm.close()
    URL.revokeObjectURL(url)
  }
}
