// The live trainer for the workout screen: one session at a time, its state for the Talk button, and
// the server's token. The session itself is in session.js; this file only wires it to the browser.
import { useEffect, useState } from 'react'
import { createLiveSession } from './session.js'
import { TOOL_DECLARATIONS, handleToolCall } from './tools.js'
import { systemInstruction } from './persona.js'
import { openMic, createPlayer } from './audio-io.js'
import { beginVoiceTurn, endVoiceTurn } from '../voice-session.js'
import { api } from '../api.js'
import { useStore } from '../../store/useStore.js'
import { appendTranscript } from './english-log.js'
import { todayISO } from '../format.js'

let session = null
const subs = new Set()
let snapshot = { state: 'idle', why: null }

const publish = (state, why = null) => { snapshot = { state, why }; subs.forEach(fn => fn(snapshot)) }

async function mintToken() {
  const r = await api('/api/kinetix/live-token', { method: 'POST', body: '{}' })
  return { token: r.token, expiresAt: r.expiresAt, wsUrl: r.wsUrl, model: r.model }
}

/** The session for this workout, made on first use with that day's summary. */
export function liveTrainer({ todaySummary, unit }) {
  if (!session) {
    session = createLiveSession({
      systemInstruction: systemInstruction({ todaySummary, unit }),
      tools: TOOL_DECLARATIONS,
      model: 'gemini-3.8-live',
      onToolCall: handleToolCall,
      onTranscript: ev => { const now = Date.now(); const day = todayISO(); useStore.getState().update(s => { appendTranscript(s, day, ev, now) }) },
      onState: (s, why) => publish(s, why),
      audio: { openMic, createPlayer },
      voice: { beginVoiceTurn, endVoiceTurn },
      mintToken,
    })
  }
  return session
}

/** The Talk button's state: idle, connecting, listening, speaking, or error with why ('quota'). */
export function useLiveTrainer() {
  const [s, set] = useState(snapshot)
  useEffect(() => { subs.add(set); return () => { subs.delete(set) } }, [])
  return s
}
