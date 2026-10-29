<script setup lang="ts">
import type { GameContext } from '../types'
import { createRng, randInt } from '../../core/random'
import { complexity, nextStarDelayMs, speed, starWindowMs, trackPoint } from './logic'
import { MIN_HIT_RADIUS, StarBursts, clamp, shakeOffset, starPath, useCanvas } from '../_kit/canvas'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const rng = createRng(Date.now())
const bursts = new StarBursts()
const SAMPLES = 600
const CARS = 3                       // 车头 + 2 节车厢

// 轨道：按弧长采样的像素折线，使火车在弯道上也匀速行驶
let pts: { x: number; y: number }[] = []
let cum: number[] = []
let totalLen = 1
let builtFor = ''
let cx = complexity(props.level)

let s = 0                            // 车头位置，单位：轨道周长（0–1）
let carLen = 50
let nextStarAt = 0                   // rAF 时间戳
let star: { car: number; start: number; until: number } | null = null
let shake: { car: number; at: number } | null = null
let lastNow = 0

function buildTrack(w: number, h: number) {
  const key = `${w}x${h}x${cx}`
  if (key === builtFor) return
  builtFor = key
  carLen = clamp(Math.min(w, h) * 0.11, 40, 80)
  const m = carLen * 0.75 + 6
  const iw = Math.max(1, w - 2 * m), ih = Math.max(1, h - 2 * m)
  pts = []
  for (let i = 0; i <= SAMPLES; i++) {
    const p = trackPoint(i / SAMPLES, cx)
    // trackPoint 的范围是 x∈[0.1,0.9]、y∈[0.15,0.85]，拉伸到整个舞台
    pts.push({ x: m + ((p.x - 0.1) / 0.8) * iw, y: m + ((p.y - 0.15) / 0.7) * ih })
  }
  cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  totalLen = cum[cum.length - 1] || 1
}

/** 弧长参数 u（0–1，可越界，自动取模）→ 位置与切线角 */
function pointAt(u: number) {
  const target = (((u % 1) + 1) % 1) * totalLen
  let lo = 0, hi = cum.length - 1
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= target) lo = mid; else hi = mid }
  const seg = cum[hi] - cum[lo] || 1
  const f = (target - cum[lo]) / seg
  const a = pts[lo], b = pts[hi]
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, ang: Math.atan2(b.y - a.y, b.x - a.x) }
}

const carU = (i: number) => s - (i * carLen * 1.2) / totalLen

function scheduleStar(now: number) {
  // 注意：此刻 props.level 可能还没更新（父组件下一次渲染才传入），等级相关的参数在星星出现时再读取
  star = null
  nextStarAt = now + nextStarDelayMs(rng)
}

function onPointerDown(e: PointerEvent) {
  if (!star || !pts.length) return
  const p = toLocal(e)
  const c = pointAt(carU(star.car))
  if (Math.hypot(p.x - c.x, p.y - c.y) > Math.max(carLen * 0.8, MIN_HIT_RADIUS)) return   // 点其他地方不判定
  bursts.add(c.x, c.y, lastNow, carLen * 0.7)
  emit('trial', true)
  scheduleStar(lastNow)
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

function drawTrack(g: CanvasRenderingContext2D) {
  g.lineJoin = 'round'; g.lineCap = 'round'
  g.strokeStyle = '#d8c9a8'
  g.lineWidth = carLen * 0.55
  g.beginPath()
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
  g.stroke()
  g.strokeStyle = '#b9a785'
  g.lineWidth = 3
  g.setLineDash([carLen * 0.12, carLen * 0.22])
  g.stroke()
  g.setLineDash([])
}

function drawCar(g: CanvasRenderingContext2D, i: number, now: number) {
  const c = pointAt(carU(i))
  const L = carLen, H = carLen * 0.62
  const dx = shake && shake.car === i ? shakeOffset(shake.at, now) : 0
  g.save()
  g.translate(c.x, c.y)
  g.rotate(c.ang)
  g.translate(dx, 0)
  if (star && star.car === i) {
    // 发光的星星：稳定的柔光，淡入 200ms，不闪烁
    const a = clamp((now - star.start) / 200, 0, 1)
    g.globalAlpha = a
    g.rotate(-c.ang)
    const halo = g.createRadialGradient(0, 0, L * 0.1, 0, 0, L * 0.85)
    halo.addColorStop(0, 'rgba(255, 220, 120, 0.85)')
    halo.addColorStop(1, 'rgba(255, 220, 120, 0)')
    g.fillStyle = halo
    g.beginPath(); g.arc(0, 0, L * 0.85, 0, Math.PI * 2); g.fill()
    starPath(g, 0, 0, L * 0.5)
    g.fillStyle = '#f5c242'; g.fill()
    g.strokeStyle = '#d4951f'; g.lineWidth = 2; g.stroke()
  } else {
    g.fillStyle = '#4b3f36'
    for (const wx of [-L * 0.28, L * 0.28]) for (const wy of [-H / 2, H / 2]) {
      g.beginPath(); g.arc(wx, wy, L * 0.1, 0, Math.PI * 2); g.fill()
    }
    g.fillStyle = i === 0 ? '#d9776b' : i === 1 ? '#6fa8a0' : '#e0b65a'
    rr(g, -L / 2, -H / 2, L, H, L * 0.14); g.fill()
    if (i === 0) {
      g.fillStyle = '#4b3f36'
      g.beginPath(); g.arc(L * 0.22, 0, L * 0.12, 0, Math.PI * 2); g.fill()   // 烟囱（俯视）
      g.fillStyle = '#f6e7b8'
      rr(g, -L * 0.42, -H * 0.32, L * 0.32, H * 0.64, L * 0.06); g.fill()      // 驾驶室
    } else {
      g.fillStyle = 'rgba(255, 255, 255, 0.35)'
      rr(g, -L * 0.34, -H * 0.28, L * 0.68, H * 0.56, L * 0.08); g.fill()
    }
  }
  g.restore()
}

const { wrap, canvas, toLocal } = useCanvas((g, w, h, now, dt) => {
  lastNow = now
  buildTrack(w, h)
  if (!nextStarAt && !star) nextStarAt = now + nextStarDelayMs(rng)

  s = (s + speed(props.level) * dt) % 1
  if (!star && nextStarAt && now >= nextStarAt) {
    const c = complexity(props.level)
    if (c !== cx) { cx = c; builtFor = ''; buildTrack(w, h) }   // 等级变化后换轨道
    star = { car: randInt(rng, 1, CARS - 1), start: now, until: now + starWindowMs(props.level) }
    nextStarAt = 0
  }
  if (star && now >= star.until) {
    shake = { car: star.car, at: now }
    emit('trial', false)
    scheduleStar(now)
  }

  g.fillStyle = '#e4ecd6'
  g.fillRect(0, 0, w, h)
  drawTrack(g)
  for (let i = CARS - 1; i >= 0; i--) drawCar(g, i, now)
  bursts.draw(g, now)
})
</script>

<template>
  <div ref="wrap" class="game">
    <canvas ref="canvas" class="cv" @pointerdown.prevent="onPointerDown" />
  </div>
</template>

<style scoped>
.game { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
</style>
