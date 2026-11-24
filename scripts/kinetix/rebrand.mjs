// Replaces the exact, case-sensitive token `openGym` with `Kinetix` in the files the rebrand
// covers. `--check` exits 1 and lists files that still contain the token. Licence files,
// catalogue, and the iOS/Android shells are never listed here, so they keep their upstream text.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..')
const TOKEN = 'openGym'
const NAME = 'Kinetix'
const CHECK = process.argv.includes('--check')

const FIXED = [
  'frontend/index.html',
  'frontend/public/manifest.json',
  'frontend/capacitor.config.json',
  'api/server.js',
  'api/push-messages.js',
]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(js|jsx)$/.test(name)) out.push(p)
  }
  return out
}

const files = [
  ...walk(join(ROOT, 'frontend/src')),
  ...FIXED.map(f => join(ROOT, f)),
].map(p => relative(ROOT, p).split('\\').join('/'))

const dirty = files.filter(f => readFileSync(join(ROOT, f), 'utf8').includes(TOKEN))

if (CHECK) {
  if (dirty.length) {
    console.log(`${dirty.length} file(s) still contain "${TOKEN}":`)
    for (const f of dirty) console.log('  ' + f)
    process.exit(1)
  }
  console.log(`OK: no "${TOKEN}" left in ${files.length} rebrand files`)
  process.exit(0)
}

for (const f of dirty) {
  const p = join(ROOT, f)
  writeFileSync(p, readFileSync(p, 'utf8').split(TOKEN).join(NAME))
  console.log('rebranded ' + f)
}
console.log(`done: ${dirty.length} file(s)`)
