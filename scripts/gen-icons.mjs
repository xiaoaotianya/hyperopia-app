// 生成 PWA 图标：青色圆角方块 + 白色眼镜。仅用 Node 内置模块。
// 用法：node scripts/gen-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const TEAL = [0x4a, 0xa3, 0xa2]
const WHITE = [255, 255, 255]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

// 以 0..1 归一化坐标描述形状
function inRoundedSquare(x, y) {
  const r = 0.2, m = 0.0
  const qx = Math.max(Math.abs(x - 0.5) - (0.5 - m - r), 0)
  const qy = Math.max(Math.abs(y - 0.5) - (0.5 - m - r), 0)
  return qx * qx + qy * qy <= r * r
}
function inGlasses(x, y) {
  const cy = 0.53, R = 0.165, w = 0.05
  for (const cx of [0.305, 0.695]) {
    const d = Math.hypot(x - cx, y - cy)
    if (d <= R && d >= R - w) return true
  }
  // 鼻梁：小弧线，用一段圆环近似
  const bd = Math.hypot(x - 0.5, y - 0.55)
  if (y < 0.53 && Math.abs(x - 0.5) < 0.06 && bd <= 0.075 && bd >= 0.075 - 0.04) return true
  // 镜腿
  if (y >= 0.44 && y <= 0.44 + 0.04 && ((x >= 0.08 && x <= 0.17) || (x >= 0.83 && x <= 0.92))) return true
  return false
}

function render(size) {
  const S = 4 // 超采样
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0
    for (let px = 0; px < size; px++) {
      let a = 0, wsum = 0
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        const x = (px + (sx + 0.5) / S) / size, y = (py + (sy + 0.5) / S) / size
        if (inRoundedSquare(x, y)) { a++; if (inGlasses(x, y)) wsum++ }
      }
      const n = S * S
      const o = py * (size * 4 + 1) + 1 + px * 4
      const t = a ? wsum / a : 0
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(TEAL[i] * (1 - t) + WHITE[i] * t)
      raw[o + 3] = Math.round((a / n) * 255)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
for (const s of [192, 512]) writeFileSync(`public/icons/icon-${s}.png`, render(s))
console.log('icons written')
