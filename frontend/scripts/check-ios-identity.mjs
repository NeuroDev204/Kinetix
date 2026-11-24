#!/usr/bin/env node
// Checks the iOS identity Kinetix ships with: bundle ids, deployment target, entitlements (no
// associated domains and no NFC on a free team), the app group everywhere, the display name, and the
// background audio mode. Exits 1 with the list of what is wrong.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const ios = path.join(root, 'ios', 'App')
const app = path.join(ios, 'App')
const BUNDLE = 'io.github.neurodev204.kinetix'
const GROUP = 'group.io.github.neurodev204.kinetix'
const TARGET = '16.4'

const problems = []
const read = f => readFileSync(f, 'utf8')

const pbx = read(path.join(ios, 'App.xcodeproj', 'project.pbxproj'))
const bundles = [...pbx.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map(m => m[1].trim())
if (!bundles.length) problems.push('project: no PRODUCT_BUNDLE_IDENTIFIER found')
for (const b of bundles) {
  if (b === 'ch.opengym.app') problems.push(`project: bundle id still ch.opengym.app`)
  else if (b.startsWith('"') || b.endsWith('.watchkitapp') || b.endsWith('.widgets') || b.endsWith('.watchkitextension')) continue
  else if (b !== BUNDLE && !b.startsWith(BUNDLE)) problems.push(`project: bundle id ${b} is not ${BUNDLE}`)
}
const targets = [...pbx.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = ([0-9.]+);/g)].map(m => m[1])
for (const t of targets) if (t !== TARGET) problems.push(`project: deployment target ${t}, want ${TARGET}`)

if (!/platform :ios, '16\.4'/.test(read(path.join(ios, 'Podfile')))) problems.push("Podfile: platform :ios is not '16.4'")

const ent = read(path.join(app, 'App.entitlements'))
if (/com\.apple\.developer\.associated-domains/.test(ent)) problems.push('entitlements: associated-domains still present (not on a free team)')
if (/com\.apple\.developer\.nfc/.test(ent)) problems.push('entitlements: NFC still present (not on a free team)')

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n)
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p)
  }
  return out
}
for (const f of walk(app).filter(f => /\.(swift|plist|entitlements|m|h)$/.test(f))) {
  const groups = [...read(f).matchAll(/group\.(?:ch|io|com)\.[a-z0-9.]+/g)].map(m => m[0])
  for (const g of groups) if (g !== GROUP) problems.push(`${path.relative(root, f)}: app group ${g}, want ${GROUP}`)
}

const plist = read(path.join(app, 'Info.plist'))
if (!/<key>CFBundleDisplayName<\/key>\s*<string>Kinetix<\/string>/.test(plist)) problems.push('Info.plist: CFBundleDisplayName is not Kinetix')
if (/NSSupportsLiveActivities/.test(plist)) problems.push('Info.plist: NSSupportsLiveActivities still present')
if (/NFCReaderUsageDescription/.test(plist)) problems.push('Info.plist: NFCReaderUsageDescription still present')
if (!/<key>UIBackgroundModes<\/key>[\s\S]*?<array>[\s\S]*?<string>audio<\/string>/.test(plist)) problems.push('Info.plist: UIBackgroundModes has no audio')

if (problems.length) {
  console.log('iOS identity: ' + problems.length + ' problem(s)')
  for (const p of problems) console.log('  ' + p)
  process.exit(1)
}
console.log('iOS identity OK: ' + BUNDLE + ', target ' + TARGET + ', group ' + GROUP)
