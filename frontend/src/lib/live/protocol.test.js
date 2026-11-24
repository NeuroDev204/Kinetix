// Gemini Live messages: the setup and client messages the phone sends, and how each server message
// becomes the events the session reacts to. Pure: no socket, no audio.
import { describe, it, expect } from 'vitest'
import { buildSetup, audioMessage, textTurn, toolResponse, parseServerMessage } from './protocol.js'

describe('client messages', () => {
  it('setup names the model, the voice reply, the tools and the resume handle', () => {
    expect(buildSetup({ model: 'gemini-3.8-live', systemInstruction: 'Be brief.', tools: [{ name: 'log_set' }], resumeHandle: 'h1' })).toEqual({
      setup: {
        model: 'models/gemini-3.8-live',
        generationConfig: { responseModalities: ['AUDIO'] },
        systemInstruction: { parts: [{ text: 'Be brief.' }] },
        tools: [{ functionDeclarations: [{ name: 'log_set' }] }],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: { slidingWindow: {} },
        sessionResumption: { handle: 'h1' },
      },
    })
  })

  it('no resume handle means an empty resumption block', () => {
    expect(buildSetup({ model: 'm', systemInstruction: 's', tools: [] }).setup.sessionResumption).toEqual({})
  })

  it('audio, text and tool results', () => {
    expect(audioMessage('AAAA')).toEqual({ realtimeInput: { audio: { data: 'AAAA', mimeType: 'audio/pcm;rate=16000' } } })
    expect(textTurn('hi')).toEqual({ clientContent: { turns: [{ role: 'user', parts: [{ text: 'hi' }] }], turnComplete: true } })
    expect(toolResponse([{ id: 'c1', name: 'log_set', response: { ok: true } }])).toEqual({ toolResponse: { functionResponses: [{ id: 'c1', name: 'log_set', response: { ok: true } }] } })
  })
})

describe('server messages', () => {
  it('setup complete', () => {
    expect(parseServerMessage({ setupComplete: {} })).toEqual([{ type: 'setupComplete' }])
  })

  it('audio and both transcripts from one message become two events', () => {
    const ev = parseServerMessage({ serverContent: { modelTurn: { parts: [{ inlineData: { data: 'BBBB', mimeType: 'audio/pcm' } }] }, outputTranscription: { text: 'good set' } } })
    expect(ev).toEqual([{ type: 'audio', data: 'BBBB' }, { type: 'outputText', text: 'good set' }])
  })

  it('input transcript, turn complete and interruption', () => {
    expect(parseServerMessage({ serverContent: { inputTranscription: { text: 'I did five' } } })).toEqual([{ type: 'inputText', text: 'I did five' }])
    expect(parseServerMessage({ serverContent: { turnComplete: true } })).toEqual([{ type: 'turnComplete' }])
    expect(parseServerMessage({ serverContent: { interrupted: true } })).toEqual([{ type: 'interrupted' }])
  })

  it('a tool call and a cancelled call', () => {
    expect(parseServerMessage({ toolCall: { functionCalls: [{ id: 'c1', name: 'log_set', args: { weight: 80 } }] } }))
      .toEqual([{ type: 'toolCall', calls: [{ id: 'c1', name: 'log_set', args: { weight: 80 } }] }])
    expect(parseServerMessage({ toolCallCancellation: { ids: ['c1'] } })).toEqual([{ type: 'toolCancel', ids: ['c1'] }])
  })

  it('a resumable session update carries the handle; a go-away carries the time left', () => {
    expect(parseServerMessage({ sessionResumptionUpdate: { newHandle: 'h2', resumable: true } })).toEqual([{ type: 'resume', handle: 'h2' }])
    expect(parseServerMessage({ sessionResumptionUpdate: { newHandle: 'h2', resumable: false } })).toEqual([])
    expect(parseServerMessage({ goAway: { timeLeft: '45s' } })).toEqual([{ type: 'goAway', timeLeftMs: 45000 }])
  })
})
