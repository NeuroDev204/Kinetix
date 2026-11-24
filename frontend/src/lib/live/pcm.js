// Audio helpers for the live session. Pure: no AudioContext here.

/** Resamples by averaging each group of input samples into one output sample. */
export function downsample(f32, fromRate, toRate = 16000) {
  if (fromRate === toRate) return Float32Array.from(f32)
  const ratio = fromRate / toRate
  const n = Math.floor(f32.length / ratio)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const start = Math.floor(i * ratio), end = Math.min(f32.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = start; j < end; j++) sum += f32[j]
    out[i] = end > start ? sum / (end - start) : 0
  }
  return out
}

/** Float samples in [-1, 1] to signed 16-bit, clamped. */
export function floatTo16(f32) {
  const out = new Int16Array(f32.length)
  for (let i = 0; i < f32.length; i++) {
    const v = Math.max(-1, Math.min(1, f32[i]))
    out[i] = v < 0 ? Math.round(v * 0x8000) : Math.round(v * 0x7fff)
  }
  return out
}

export function int16ToBase64(i16) {
  const bytes = new Uint8Array(i16.buffer, i16.byteOffset, i16.byteLength)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function base64ToFloat32(b64) {
  const bin = atob(b64)
  const i16 = new Int16Array(bin.length >> 1)
  for (let i = 0; i < i16.length; i++) i16[i] = (bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8))
  const out = new Float32Array(i16.length)
  for (let i = 0; i < i16.length; i++) out[i] = i16[i] / 32768
  return out
}

export function rms(f32) {
  if (!f32.length) return 0
  let s = 0
  for (let i = 0; i < f32.length; i++) s += f32[i] * f32[i]
  return Math.sqrt(s / f32.length)
}
