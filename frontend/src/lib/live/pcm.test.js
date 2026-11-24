// PCM conversions for the live audio: resampling the microphone to 16 kHz, 16-bit samples, base64
// for the socket, and the level meter.
import { describe, it, expect } from 'vitest'
import { downsample, floatTo16, int16ToBase64, base64ToFloat32, rms } from './pcm.js'

describe('pcm', () => {
  it('48 kHz to 16 kHz takes a third of the samples', () => {
    const out = downsample(new Float32Array(480).fill(0.25), 48000, 16000)
    expect(out.length).toBe(160)
    expect(out[0]).toBeCloseTo(0.25)
  })

  it('float samples become signed 16-bit, clamped at both ends', () => {
    expect(Array.from(floatTo16(Float32Array.from([1, -1, 0])))).toEqual([32767, -32768, 0])
    expect(Array.from(floatTo16(Float32Array.from([2, -3])))).toEqual([32767, -32768])
  })

  it('base64 round-trips the samples', () => {
    const i16 = Int16Array.from([0, 1000, -1000, 32767])
    const back = base64ToFloat32(int16ToBase64(i16))
    expect(back.length).toBe(4)
    expect(back[1]).toBeCloseTo(1000 / 32768, 5)
    expect(back[2]).toBeCloseTo(-1000 / 32768, 5)
  })

  it('rms of a constant signal is that level', () => {
    expect(rms(Float32Array.from([0.5, 0.5, 0.5, 0.5]))).toBeCloseTo(0.5)
    expect(rms(new Float32Array(0))).toBe(0)
  })
})
