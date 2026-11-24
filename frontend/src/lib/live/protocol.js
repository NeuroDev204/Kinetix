// Gemini Live messages (BidiGenerateContent, v1beta): the messages the phone sends, and the events
// a server message turns into. Pure: the socket and the audio live in session.js and audio-io.js.

export const MIC_MIME = 'audio/pcm;rate=16000'

/** The first message on a socket: the model, the voice reply, the tools, and a resume handle if any. */
export function buildSetup({ model, systemInstruction, tools, resumeHandle }) {
  return {
    setup: {
      model: 'models/' + model,
      generationConfig: { responseModalities: ['AUDIO'] },
      systemInstruction: { parts: [{ text: systemInstruction }] },
      tools: [{ functionDeclarations: tools }],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      contextWindowCompression: { slidingWindow: {} },
      sessionResumption: resumeHandle ? { handle: resumeHandle } : {},
    },
  }
}

/** One chunk of microphone audio, base64 of 16 kHz 16-bit PCM. */
export const audioMessage = b64 => ({ realtimeInput: { audio: { data: b64, mimeType: MIC_MIME } } })

/** A typed turn, for when the person types instead of speaking. */
export const textTurn = text => ({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } })

/** The results of tool calls, each answered under the id the call came with. */
export const toolResponse = results => ({ toolResponse: { functionResponses: results } })

/** Server message to events. A message can carry several things at once; each becomes an event. */
export function parseServerMessage(msg) {
  const out = []
  if (!msg || typeof msg !== 'object') return out
  if (msg.setupComplete) out.push({ type: 'setupComplete' })
  const sc = msg.serverContent
  if (sc) {
    for (const part of sc.modelTurn?.parts || []) {
      if (part.inlineData?.data) out.push({ type: 'audio', data: part.inlineData.data })
    }
    if (sc.outputTranscription?.text) out.push({ type: 'outputText', text: sc.outputTranscription.text })
    if (sc.inputTranscription?.text) out.push({ type: 'inputText', text: sc.inputTranscription.text })
    if (sc.interrupted) out.push({ type: 'interrupted' })
    if (sc.turnComplete) out.push({ type: 'turnComplete' })
  }
  if (msg.toolCall?.functionCalls) {
    out.push({ type: 'toolCall', calls: msg.toolCall.functionCalls.map(c => ({ id: c.id, name: c.name, args: c.args || {} })) })
  }
  if (msg.toolCallCancellation?.ids) out.push({ type: 'toolCancel', ids: msg.toolCallCancellation.ids })
  const sr = msg.sessionResumptionUpdate
  if (sr && sr.resumable && sr.newHandle) out.push({ type: 'resume', handle: sr.newHandle })
  if (msg.goAway) out.push({ type: 'goAway', timeLeftMs: parseDuration(msg.goAway.timeLeft) })
  return out
}

// "45s" or "1.5s" from the server to milliseconds; anything else is 0 (no time known).
const parseDuration = v => {
  const m = /^(\d+(?:\.\d+)?)s$/.exec(String(v || ''))
  return m ? Math.round(Number(m[1]) * 1000) : 0
}
