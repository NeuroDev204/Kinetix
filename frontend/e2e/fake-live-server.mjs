// A stand-in for the Gemini Live socket, for the E2E run. On the first microphone chunk of a turn it
// answers the way the real model would for "log eighty kilos five reps": a transcript, a log_set
// tool call, and after the tool's answer a short reply with its transcript and turn end. Audio is a
// silent PCM chunk; nothing real is spoken.
import { WebSocketServer } from 'ws'

export async function startFakeLive(port = 3199) {
  const wss = new WebSocketServer({ host: '127.0.0.1', port })
  const sent = []
  const received = []
  wss.on('connection', ws => {
    const send = msg => { sent.push(msg); ws.send(JSON.stringify(msg)) }
    let asked = false
    ws.on('message', raw => {
      const msg = JSON.parse(String(raw))
      received.push(msg)
      if (msg.setup) {
        send({ setupComplete: {} })
        send({ sessionResumptionUpdate: { newHandle: 'h-e2e', resumable: true } })
      } else if (msg.realtimeInput?.audio && !asked) {
        asked = true
        send({ serverContent: { inputTranscription: { text: 'log eighty kilos five reps' } } })
        send({ toolCall: { functionCalls: [{ id: 'c1', name: 'log_set', args: { weight: 80, reps: 5 } }] } })
      } else if (msg.toolResponse) {
        send({ serverContent: { modelTurn: { parts: [{ inlineData: { data: Buffer.alloc(960).toString('base64'), mimeType: 'audio/pcm;rate=24000' } }] }, outputTranscription: { text: 'Logged 80 kilos for 5.' } } })
        send({ serverContent: { turnComplete: true } })
      }
    })
  })
  await new Promise(r => wss.on('listening', r))
  return { url: `ws://127.0.0.1:${port}`, sent, received, stop: () => new Promise(r => wss.close(() => r())) }
}
