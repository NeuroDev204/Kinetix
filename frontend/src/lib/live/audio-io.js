// Browser audio for the live session: the microphone (as 16 kHz PCM frames) and the voice reply
// (24 kHz, queued so it plays without gaps). Not unit-tested; the conversions are in pcm.js.
import { downsample, floatTo16, int16ToBase64, base64ToFloat32, rms } from './pcm.js'

/** Starts the microphone. onChunk(b64, level) gets every 20 ms frame, already 16 kHz PCM. */
export async function openMic({ onChunk }) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  await ctx.audioWorklet.addModule('/live/mic-worklet.js')
  const src = ctx.createMediaStreamSource(stream)
  const node = new AudioWorkletNode(ctx, 'mic-frames')
  node.port.onmessage = e => {
    const f = e.data
    const down = downsample(f, ctx.sampleRate, 16000)
    onChunk(int16ToBase64(floatTo16(down)), rms(down))
  }
  src.connect(node)
  return {
    close() {
      try { node.port.onmessage = null; src.disconnect(); node.disconnect() } catch { /* already gone */ }
      stream.getTracks().forEach(t => t.stop())
      ctx.close().catch(() => {})
    },
  }
}

/** The voice reply: push(b64) queues a chunk of 24 kHz PCM; clear() drops what is queued. */
export function createPlayer() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 })
  let at = 0
  let sources = []
  return {
    push(b64) {
      const f = base64ToFloat32(b64)
      const buf = ctx.createBuffer(1, f.length, 24000)
      buf.copyToChannel(f, 0)
      const s = ctx.createBufferSource()
      s.buffer = buf
      s.connect(ctx.destination)
      at = Math.max(at, ctx.currentTime + 0.02)
      s.start(at)
      at += buf.duration
      sources.push(s)
      s.onended = () => { sources = sources.filter(x => x !== s) }
    },
    clear() {
      for (const s of sources) { try { s.stop() } catch { /* not started */ } }
      sources = []
      at = 0
    },
    close() { this.clear(); ctx.close().catch(() => {}) },
    playing() { return sources.length > 0 },
  }
}
