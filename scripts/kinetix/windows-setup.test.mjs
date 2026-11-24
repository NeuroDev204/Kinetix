// The Windows setup script names every step in order, and parses if PowerShell is installed.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const ps1 = readFileSync(path.join(here, 'windows-setup.ps1'), 'utf8')

test('the script has each step: tools, Ollama settings, model, .env, server, setup, tailscale, pairing', () => {
  const steps = [
    'Get-Command $_.name',
    "SetEnvironmentVariable('OLLAMA_CONTEXT_LENGTH', '8192', 'User')",
    "SetEnvironmentVariable('OLLAMA_HOST', '0.0.0.0:11434', 'User')",
    'ollama pull qwen3.5:4b',
    "Copy-Item '.env.example' '.env'",
    'Read-Host',
    'docker compose up -d --build',
    'docker compose exec api node scripts/kinetix-setup.mjs',
    'tailscale serve --bg 8080',
    'Pair the mobile app',
  ]
  let at = 0
  for (const s of steps) {
    const i = ps1.indexOf(s, at)
    assert.ok(i >= at, 'missing or out of order: ' + s)
    at = i
  }
})

test('the key is typed as a secure string and never written to the console', () => {
  assert.match(ps1, /-AsSecureString/)
  assert.doesNotMatch(ps1, /Write-Host[^\n]*\$plain/)
})

test('it parses in PowerShell when PowerShell is installed', t => {
  const probe = spawnSync('pwsh', ['-NoProfile', '-Command', 'exit 0'])
  if (probe.error) return t.skip('pwsh not installed')
  const r = spawnSync('pwsh', ['-NoProfile', '-Command', `[ScriptBlock]::Create((Get-Content -Raw '${path.join(here, 'windows-setup.ps1')}')) | Out-Null`])
  assert.equal(r.status, 0, String(r.stderr))
})
