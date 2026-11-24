// Copies the MediaPipe wasm files the pose runner loads (/mediapipe/wasm) into public/, from the
// pinned package in node_modules. The copy is git-ignored and made before dev and build.
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const from = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const to = path.join(root, 'public', 'mediapipe', 'wasm')
rmSync(to, { recursive: true, force: true })
mkdirSync(to, { recursive: true })
cpSync(from, to, { recursive: true })
console.log('copied MediaPipe wasm to public/mediapipe/wasm')
