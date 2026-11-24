// Ends the person's turn: after `silenceMs` of quiet (below `threshold`) once they have said
// something. Pure timing on the level the mic reports; the caller passes the clock.
export function createTurnTimer({ silenceMs = 3000, threshold = 0.01, onEnd } = {}) {
  let spoke = false
  let quietSince = null
  let done = false
  return {
    feed(level, nowMs = Date.now()) {
      if (done) return
      if (level >= threshold) { spoke = true; quietSince = null; return }
      if (!spoke) return
      if (quietSince == null) quietSince = nowMs
      if (nowMs - quietSince >= silenceMs) { done = true; onEnd && onEnd() }
    },
    reset() { spoke = false; quietSince = null; done = false },
  }
}
