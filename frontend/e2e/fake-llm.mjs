// A local stand-in for an OpenAI-compatible model server, for the E2E flows. It answers with a fixed,
// valid Coach answer for the kind of job it is asked (read from the payload the server sent). No
// real model, no key, nothing leaves the machine. The HTTP adapter path is the one exercised.
import http from 'node:http'

const ANSWERS = {
  meal: { coach_contract: 1, items: [{ name: 'Fixture rice', grams: 200, kcal: 260, protein: 5, carbs: 57, fat: 1 }] },
  physique: { coach_contract: 1, physique: { bodyFatRange: [12, 16], notes: 'Fake estimate for the E2E run.', focusAreas: ['core'] } },
  review: { coach_contract: 1, summary: 'Eat a little less and keep training.', evidence: { from: null, to: null, sessions: 0 }, changes: [], nutrition: { kcal: 1850, protein: 130, carbs: 200, fat: 55, why: 'Weight is flat over the fortnight.', mealPlan: [{ day: 'Mon', meals: ['oats with berries'] }] } },
  form: { coach_contract: 1, summary: 'Steady tempo, heels lifted at the bottom.', issues: [{ rep: 3, issue: 'Heels lifted.', cue: 'Keep weight through the heels.' }], score: 6 },
  create: { coach_contract: 1, ok: true },
}

// The payload is the last part of the prompt, so the last "task" names the job.
function pick(text) {
  const all = [...text.matchAll(/"task"\s*:\s*"([a-z]+)"/g)]
  const last = all.length ? all[all.length - 1][1] : null
  return last && ANSWERS[last] ? ANSWERS[last] : { coach_contract: 1, ok: true }
}

export async function startFakeLlm() {
  // quota: when true every chat answer is a 429, the free tier's limit (the flow for a retry).
  const state = { quota: false }
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/v1/models')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ object: 'list', data: [{ id: 'fake', object: 'model' }] }))
    }
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', () => {
      let prompt = body
      try { prompt = JSON.parse(body).messages.map(m => String(m.content)).join('\n') } catch { /* not JSON: match the raw text */ }
      if (state.quota) { res.writeHead(429, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: { message: 'quota exceeded' } })) }
      const answer = pick(prompt)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ id: 'fake', object: 'chat.completion', model: 'fake', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(answer) } }] }))
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return { baseUrl: `http://127.0.0.1:${port}/v1`, setQuota: on => { state.quota = !!on }, stop: () => new Promise(r => server.close(() => r())) }
}
