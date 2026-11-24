// Microphone capture for the live session: posts 20 ms frames of the input to the page. The page
// downsamples them to 16 kHz (lib/live/pcm.js). Runs on the audio thread.
class MicFrames extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buf = []
    this.count = 0
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (!ch) return true
    this.buf.push(Float32Array.from(ch))
    this.count += ch.length
    // 20 ms at the context rate: sampleRate / 50 samples per frame.
    const want = Math.round(sampleRate / 50)
    if (this.count >= want) {
      const frame = new Float32Array(this.count)
      let o = 0
      for (const b of this.buf) { frame.set(b, o); o += b.length }
      this.port.postMessage(frame, [frame.buffer])
      this.buf = []
      this.count = 0
    }
    return true
  }
}
registerProcessor('mic-frames', MicFrames)
