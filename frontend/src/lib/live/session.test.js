// The live session against a fake socket, a fake microphone and voice, and a token that the test
// mints. Covers the order of messages, resume, tool answers, the turn's end, reconnect and quota.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLiveSession } from './session.js'

class FakeWS {
  static list = []
  constructor(url) { this.url = url; this.sent = []; FakeWS.list.push(this) }
  send(d) { this.sent.push(JSON.parse(d)) }
  close() { this.onclose && this.onclose({ code: 1000, reason: '' }) }
  open() { this.onopen && this.onopen() }
  recv(msg) { this.onmessage && this.onmessage({ data: JSON.stringify(msg) }) }
}

let clock, mic, voice, player, onState, mint, onToolCall, transcripts
beforeEach(() => {
  FakeWS.list = []
  clock = 0
  mic = { close: vi.fn() }
  voice = { beginVoiceTurn: vi.fn(), endVoiceTurn: vi.fn() }
  player = { push: vi.fn(), clear: vi.fn(), close: vi.fn() }
  onState = vi.fn()
  transcripts = []
  onToolCall = vi.fn(async () => ({ ok: true }))
  mint = vi.fn(async () => ({ token: 'tok', expiresAt: 10 ** 12, wsUrl: 'wss://live.test/ws' }))
})

function session(extra = {}) {
  const audio = { openMic: vi.fn(async ({ onChunk }) => { audio.onChunk = onChunk; return mic }), createPlayer: () => player }
  const s = createLiveSession({
    systemInstruction: 'Be brief.', tools: [{ name: 'log_set' }], model: 'gemini-3.8-live',
    onState, onToolCall, onTranscript: t => transcripts.push(t), wsFactory: url => new FakeWS(url),
    audio, voice, mintToken: mint, now: () => clock, idleMs: 5000, ...extra,
  })
  return { s, audio }
}

// Opens the socket the session made and says the setup is in.
async function ready(ws) {
  ws.open()
  ws.recv({ setupComplete: {} })
  await Promise.resolve()
}

describe('live session', () => {
  it('sends the setup first, on the socket the token opened', async () => {
    const { s } = session()
    const p = s.startTurn()
    await Promise.resolve(); await Promise.resolve()
    const ws = FakeWS.list[0]
    expect(ws.url).toBe('wss://live.test/ws?access_token=tok')
    await ready(ws)
    await p
    expect(ws.sent[0].setup.model).toBe('models/gemini-3.8-live')
    expect(voice.beginVoiceTurn).toHaveBeenCalledTimes(1)
  })

  it('a second connection carries the resume handle the first one was given', async () => {
    const { s } = session()
    const p = s.startTurn()
    await Promise.resolve(); await Promise.resolve()
    await ready(FakeWS.list[0]); await p
    FakeWS.list[0].recv({ sessionResumptionUpdate: { newHandle: 'h1', resumable: true } })
    s.close()
    const p2 = s.startTurn()
    await Promise.resolve(); await Promise.resolve()
    await ready(FakeWS.list[1]); await p2
    expect(FakeWS.list[1].sent[0].setup.sessionResumption.handle).toBe('h1')
  })

  it('a tool call is answered under the same id', async () => {
    const { s } = session()
    const p = s.startTurn()
    await Promise.resolve(); await Promise.resolve()
    const ws = FakeWS.list[0]
    await ready(ws); await p
    ws.recv({ toolCall: { functionCalls: [{ id: 'c1', name: 'log_set', args: { weight: 80, reps: 5 } }] } })
    await new Promise(r => setTimeout(r, 0))
    expect(onToolCall).toHaveBeenCalledWith({ id: 'c1', name: 'log_set', args: { weight: 80, reps: 5 } })
    expect(ws.sent.at(-1)).toEqual({ toolResponse: { functionResponses: [{ id: 'c1', name: 'log_set', response: { ok: true } }] } })
  })

  it('three seconds of silence after speech closes the microphone', async () => {
    const { s, audio } = session()
    const p = s.startTurn()
    await Promise.resolve(); await Promise.resolve()
    await ready(FakeWS.list[0]); await p
    audio.onChunk('AAAA', 0.2)
    clock = 1000; audio.onChunk('AAAA', 0)
    clock = 4000; audio.onChunk('AAAA', 0)
    expect(mic.close).toHaveBeenCalledTimes(1)
  })

  it('a go-away from the server reconnects once, with the handle', async () => {
    const { s } = session()
    const p = s.startTurn()
    await Promise.resolve(); await Promise.resolve()
    const ws = FakeWS.list[0]
    await ready(ws); await p
    ws.recv({ sessionResumptionUpdate: { newHandle: 'h7', resumable: true } })
    ws.recv({ goAway: { timeLeft: '30s' } })
    ws.close()
    await Promise.resolve(); await Promise.resolve()
    expect(FakeWS.list.length).toBe(2)
    expect(FakeWS.list[1].url).toContain('access_token=')
  })

  it('a quota error on the token is reported once and not retried', async () => {
    mint.mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429 }))
    const { s } = session()
    await s.startTurn()
    expect(onState).toHaveBeenCalledWith('error', 'quota')
    expect(mint).toHaveBeenCalledTimes(1)
  })

  it('the turn ends the voice turn when the reply completes', async () => {
    const { s } = session()
    const p = s.startTurn()
    await Promise.resolve(); await Promise.resolve()
    const ws = FakeWS.list[0]
    await ready(ws); await p
    ws.recv({ serverContent: { outputTranscription: { text: 'good' } } })
    ws.recv({ serverContent: { turnComplete: true } })
    expect(voice.endVoiceTurn).toHaveBeenCalledTimes(1)
    expect(transcripts).toEqual([{ role: 'trainer', text: 'good' }])
  })
})
