// Starts a throwaway api + vite dev server for the E2E tests. The data folder is a fresh temp dir,
// removed on stop(). Ports are fixed (api 3100, web 5174) so the passkey origin is stable.
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '..')
const API = path.resolve(FRONTEND, '../api')
const API_PORT = 3100
const WEB_PORT = 5174
const BASE = `http://localhost:${WEB_PORT}`

async function waitFor(url, ms = 60000) {
  const end = Date.now() + ms
  for (;;) {
    try { if ((await fetch(url)).ok) return } catch { /* not up yet */ }
    if (Date.now() > end) throw new Error('timed out waiting for ' + url)
    await new Promise(r => setTimeout(r, 300))
  }
}

export async function startStack({ coach = { enabled: true, provider: 'fixture' }, env = {} } = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kinetix-e2e-'))
  // Write coach.json through the api's own config module, so the file shape is the one it reads.
  execFileSync(process.execPath, ['--input-type=module', '-e',
    `const c = await import(${JSON.stringify(path.join(API, 'coach/config.js'))}); c.save(JSON.parse(process.env.COACH_JSON));`],
  { cwd: API, env: { ...process.env, DATA_DIR: dataDir, COACH_JSON: JSON.stringify(coach) } })

  const api = spawn(process.execPath, [path.join(API, 'server.js')], {
    cwd: API,
    env: { ...process.env, DATA_DIR: dataDir, PORT: String(API_PORT), RP_ID: 'localhost', ORIGIN: BASE, FIRST_USER_ADMIN: '1', ...env },
    stdio: 'ignore',
  })
  const web = spawn(path.join(FRONTEND, 'node_modules/.bin/vite'), ['--port', String(WEB_PORT), '--strictPort'], {
    cwd: FRONTEND,
    env: { ...process.env, API_TARGET: `http://127.0.0.1:${API_PORT}`, API_ORIGIN: BASE },
    stdio: 'ignore',
  })

  const stop = async () => {
    for (const p of [web, api]) { try { p.kill('SIGTERM') } catch { /* already gone */ } }
    await new Promise(r => setTimeout(r, 500))
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
  try {
    await waitFor(`http://127.0.0.1:${API_PORT}/api/health`)
    await waitFor(BASE)
  } catch (e) { await stop(); throw e }
  return { baseURL: BASE, dataDir, stop }
}
