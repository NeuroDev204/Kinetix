// A turn-based Gemini Live session. The socket opens when the person starts talking and closes a
// few seconds after the reply. The token is minted by the server and cached until just before it
// expires. Everything the browser or the server does is behind an injected seam, so the flow is
// testable without a microphone or a network.
import { buildSetup, audioMessage, textTurn, toolResponse, parseServerMessage } from './protocol.js'
import { createTurnTimer } from './turn.js'

export function createLiveSession({
  systemInstruction, tools = [], model, wsUrl,
  onToolCall = async () => ({ ok: false, error: 'no tools' }),
  onTranscript = () => {}, onState = () => {},
  wsFactory = url => new WebSocket(url),
  audio, voice, mintToken,
  now = Date.now, idleMs = 5000,
}) {
  let token = null, tokenExp = 0, socketUrl = wsUrl
  let ws = null, ready = false, readyWaiters = []
  let handle = null, reconnectNext = false, reconnected = false
  let mic = null, turn = null, idle = null, stopped = false
  const player = audio.createPlayer ? audio.createPlayer() : null

  const setState = (s, why) => onState(s, why)
  const send = msg => { if (ws && ready) ws.send(JSON.stringify(msg)) }
  const whenReady = () => ready ? Promise.resolve() : new Promise(r => readyWaiters.push(r))
  const clearIdle = () => { if (idle) { clearTimeout(idle); idle = null } }

  async function getToken() {
    if (!token || now() > tokenExp - 60000) {
      const r = await mintToken()
      token = r.token
      tokenExp = r.expiresAt
      socketUrl = r.wsUrl || socketUrl
    }
  }

  async function connect() {
    if (ws) return whenReady()
    await getToken()
    ready = false
    const sock = wsFactory(`${socketUrl}?access_token=${encodeURIComponent(token)}`)
    ws = sock
    sock.onopen = () => sock.send(JSON.stringify(buildSetup({ model, systemInstruction, tools, resumeHandle: handle })))
    sock.onmessage = e => handle_(JSON.parse(e.data))
    sock.onclose = e => onClosed(e)
    return whenReady()
  }

  function handle_(msg) {
    for (const ev of parseServerMessage(msg)) {
      if (ev.type === 'setupComplete') {
        ready = true
        const w = readyWaiters; readyWaiters = []; w.forEach(r => r())
      } else if (ev.type === 'audio') {
        player && player.push(ev.data)
        setState('speaking')
      } else if (ev.type === 'inputText' || ev.type === 'outputText') {
        onTranscript({ role: ev.type === 'inputText' ? 'user' : 'trainer', text: ev.text })
      } else if (ev.type === 'interrupted') {
        player && player.clear()
      } else if (ev.type === 'turnComplete') {
        voice.endVoiceTurn()
        setState('listening')
        clearIdle()
        idle = setTimeout(() => closeSocket(), idleMs)
      } else if (ev.type === 'toolCall') {
        for (const c of ev.calls) {
          Promise.resolve(onToolCall(c)).then(result => send(toolResponse([{ id: c.id, name: c.name, response: result }])))
        }
      } else if (ev.type === 'resume') {
        handle = ev.handle
      } else if (ev.type === 'goAway') {
        reconnectNext = true
      }
    }
  }

  function onClosed(e) {
    ws = null
    ready = false
    if (stopped) return
    const quota = e && /quota/i.test(String(e.reason || ''))
    if (quota) { setState('error', 'quota'); return }
    if ((reconnectNext || turn) && !reconnected) {
      reconnected = true
      reconnectNext = false
      connect().catch(err => failure(err))
      return
    }
    setState('idle')
  }

  function closeSocket() {
    clearIdle()
    if (ws) { const s = ws; ws = null; ready = false; s.close() }
    setState('idle')
  }

  function failure(err) {
    if (err && (err.status === 429 || err.code === 'quota')) setState('error', 'quota')
    else setState('error', 'network')
  }

  async function startTurn() {
    clearIdle()
    try {
      setState('connecting')
      await connect()
    } catch (err) { return failure(err) }
    voice.beginVoiceTurn()
    turn = createTurnTimer({
      onEnd: () => { if (mic) { mic.close(); mic = null } setState('speaking') },
    })
    mic = await audio.openMic({
      onChunk: (b64, level) => {
        send(audioMessage(b64))
        if (turn) turn.feed(level, now())
      },
    })
    setState('listening')
  }

  async function sendText(text) {
    clearIdle()
    try {
      setState('connecting')
      await connect()
    } catch (err) { return failure(err) }
    voice.beginVoiceTurn()
    send(textTurn(text))
    setState('speaking')
  }

  return {
    startTurn,
    sendText,
    isOpen: () => !!ws && ready,
    close() {
      stopped = true
      if (mic) { mic.close(); mic = null }
      if (player) player.close()
      clearIdle()
      if (ws) { const s = ws; ws = null; ready = false; s.close() }
      setState('idle')
    },
  }
}
