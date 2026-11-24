// Writes the two E2E photos (a meal and a body) as solid-colour PNGs into e2e/fixtures/. They are
// made here, from nothing, so no exercise media from catalogue/ is ever used as a test input.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

function png(w, h, [r, g, b]) {
  const row = Buffer.alloc(1 + w * 3)
  for (let x = 0; x < w; x++) row.set([r, g, b], 1 + x * 3)
  const raw = Buffer.concat(Array.from({ length: h }, () => row))
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0)
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'meal.png'), png(64, 64, [210, 150, 80]))
fs.writeFileSync(path.join(OUT, 'body.png'), png(64, 64, [120, 120, 130]))
console.log('wrote meal.png and body.png to', OUT)
