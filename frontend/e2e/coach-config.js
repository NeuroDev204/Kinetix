// The coach settings every E2E flow that makes a model call starts from: a local OpenAI-compatible
// stand-in (fake-llm.mjs) answers for the whole run.
export function fakeCoach(baseUrl) {
  return {
    enabled: true, provider: 'compatible', models: { compatible: 'fake' }, providerOptions: { compatible: { baseUrl } },
    routing: { text: 'compatible', vision: 'compatible', fallback: 'compatible', live: 'compatible', liveModel: 'fake', ctx: 8192, textTimeoutMs: 60000 },
  }
}
