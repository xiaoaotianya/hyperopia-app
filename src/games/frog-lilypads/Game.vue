<script setup lang="ts">
import { onMounted } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { maybePraise } from '../praise'
import { StarBursts, shakeOffset, useCanvas, useTimers } from '../_kit/canvas'
import {
  HOP_MS, THEMES, dwellMs, hitPad, hopPos, layoutPads, nextPad, padArcmin,
  type PadLayout, type Pt, type ThemeId,
} from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const rng = createRng(Date.now())
const timers = useTimers()
const bursts = new StarBursts()

type Phase = 'idle' | 'hop' | 'dwell' | 'wait'
let phase: Phase = 'idle'
let roundLevel = props.level      // 本轮的布局等级（一轮内不变）
let theme: ThemeId = 'pond'
let L: PadLayout = { pads: [], size: 60, colW: 60, rowH: 60 }
let cur = 0                        // 青蛙所在 / 正跳向的荷叶
let hopFrom: Pt = { x: 0, y: 0 }
let hopStart = 0
let facing = 1
let dwellTimer: number | undefined
let shakeIdx = -1, shakeAt = 0
let lastW = 0, lastH = 0

function relayout(w: number, h: number) {
  lastW = w; lastH = h
  const want = props.ctx.arcminToPx(padArcmin(roundLevel))
  L = layoutPads(roundLevel, w, h, want)
}

function startRound() {
  // 判定反馈之后才读取等级：此时父组件已传入新的 level
  roundLevel = props.level
  theme = THEMES[Math.floor(rng() * THEMES.length) % THEMES.length]
  relayout(lastW || 300, lastH || 300)
  const first = L.pads[0]
  hopTo(0, { x: -L.size, y: first.y })
}

function hopTo(i: number, from: Pt) {
  cur = i
  hopFrom = from
  hopStart = performance.now()
  facing = L.pads[i].x >= from.x ? 1 : -1
  phase = 'hop'
  timers.later(land, HOP_MS)
}

function land() {
  phase = 'dwell'
  facing = 1
  dwellTimer = timers.later(() => {
    if (phase !== 'dwell') return
    phase = 'wait'
    emit('trial', false)
    timers.later(advance, 250)
  }, dwellMs(props.level))
}

function advance() {
  if (cur === L.pads.length - 1) { phase = 'wait'; timers.later(startRound, 500); return }
  const from = L.pads[cur]
  hopTo(nextPad(cur, L.pads.length), { x: from.x, y: from.y })
}

function onDown(e: PointerEvent) {
  if (phase !== 'dwell') return
  const p = toLocal(e)
  const hit = hitPad(L, p.x, p.y)
  if (hit < 0) return
  timers.cancel(dwellTimer)
  phase = 'wait'
  const now = performance.now()
  if (hit === cur) {
    const pad = L.pads[cur]
    bursts.add(pad.x, pad.y, now, L.size * 0.6)
    maybePraise(props.ctx)
    emit('trial', true)
    timers.later(advance, 550)
  } else {
    shakeIdx = hit; shakeAt = now
    emit('trial', false)
    timers.later(advance, 650)
  }
}

// ---------------- 绘制 ----------------
function background(g: CanvasRenderingContext2D, w: number, h: number) {
  const grad = g.createLinearGradient(0, 0, 0, h)
  if (theme === 'pond') { grad.addColorStop(0, '#9fd3e6'); grad.addColorStop(1, '#6fb2cf') }
  else if (theme === 'sky') { grad.addColorStop(0, '#a9d6f2'); grad.addColorStop(1, '#e3f1f8') }
  else { grad.addColorStop(0, '#d9ecb8'); grad.addColorStop(1, '#a9d08a') }
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)
  // 静态装饰：水波纹 / 远处小云 / 草叶
  g.save()
  if (theme === 'pond') {
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2
    for (let i = 0; i < 6; i++) {
      g.beginPath(); g.ellipse(((i * 0.37 + 0.11) % 1) * w, ((i * 0.53 + 0.07) % 1) * h, 26, 7, 0, 0, Math.PI * 2); g.stroke()
    }
  } else if (theme === 'sky') {
    g.fillStyle = '#f6d266'
    g.beginPath(); g.arc(w - 40, 40, 24, 0, Math.PI * 2); g.fill()
  } else {
    g.strokeStyle = 'rgba(70,130,60,0.35)'; g.lineWidth = 3; g.lineCap = 'round'
    for (let i = 0; i < 14; i++) {
      const x = ((i * 0.29 + 0.05) % 1) * w, y = ((i * 0.61 + 0.13) % 1) * h
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y - 12); g.moveTo(x, y); g.lineTo(x + 5, y - 10); g.stroke()
    }
  }
  g.restore()
}

/** 荷叶 / 云朵 / 花朵：直径恰好为 d（视觉判断的刺激，由代码精确绘制） */
function drawPad(g: CanvasRenderingContext2D, x: number, y: number, d: number) {
  const r = d / 2
  g.save()
  if (theme === 'pond') {
    g.fillStyle = '#5fae62'
    g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, -Math.PI / 2 + 0.35, -Math.PI / 2 - 0.35 + Math.PI * 2); g.closePath(); g.fill()
    g.strokeStyle = '#3f8a48'; g.lineWidth = Math.max(1.5, r * 0.06); g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, r * 0.04)
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + 0.9 + k * 1.05
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75); g.stroke()
    }
  } else if (theme === 'sky') {
    // 几个圆组成的云，整体外接直径约为 d
    g.fillStyle = '#fbfdff'
    g.strokeStyle = '#b9d3e6'; g.lineWidth = Math.max(1.5, r * 0.05)
    const puffs: [number, number, number][] = [[-0.5, 0.15, 0.48], [0.5, 0.15, 0.48], [0, -0.12, 0.6], [0, 0.28, 0.5]]
    g.beginPath()
    for (const [dx, dy, rr] of puffs) { g.moveTo(x + dx * r + rr * r, y + dy * r); g.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2) }
    g.stroke(); g.fill()
  } else {
    const petal = r * 0.42
    g.fillStyle = '#f7a8c4'; g.strokeStyle = '#e07fa3'; g.lineWidth = Math.max(1, r * 0.04)
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * Math.PI * 2) / 5
      g.beginPath(); g.arc(x + Math.cos(a) * (r - petal), y + Math.sin(a) * (r - petal), petal, 0, Math.PI * 2); g.fill(); g.stroke()
    }
    g.fillStyle = '#f6d55c'
    g.beginPath(); g.arc(x, y, r * 0.38, 0, Math.PI * 2); g.fill()
  }
  g.restore()
}

function eye(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.fillStyle = '#fdfaf3'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#2e2a26'; g.beginPath(); g.arc(x + r * 0.2, y + r * 0.1, r * 0.55, 0, Math.PI * 2); g.fill()
}

/** 小角色：青蛙 / 小鸟 / 瓢虫，s 为身体宽度 */
function drawHero(g: CanvasRenderingContext2D, x: number, y: number, s: number, dir: number) {
  const r = s / 2
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  if (theme === 'pond') {
    g.fillStyle = '#b5e86a'; g.strokeStyle = '#3f7a2e'; g.lineWidth = Math.max(1.5, r * 0.08)
    g.beginPath(); g.ellipse(0, r * 0.15, r, r * 0.72, 0, 0, Math.PI * 2); g.fill(); g.stroke()
    for (const sx of [-0.45, 0.45]) { g.beginPath(); g.arc(sx * r, -r * 0.45, r * 0.32, 0, Math.PI * 2); g.fill(); g.stroke() }
    eye(g, -0.45 * r, -0.47 * r, r * 0.2); eye(g, 0.45 * r, -0.47 * r, r * 0.2)
    g.strokeStyle = '#2e5f26'; g.lineWidth = Math.max(1.5, r * 0.07)
    g.beginPath(); g.arc(0, r * 0.12, r * 0.42, 0.3, Math.PI - 0.3); g.stroke()
    g.fillStyle = 'rgba(240,120,140,0.55)'
    for (const sx of [-0.62, 0.62]) { g.beginPath(); g.arc(sx * r, r * 0.25, r * 0.12, 0, Math.PI * 2); g.fill() }
  } else if (theme === 'sky') {
    g.fillStyle = '#f6c945'; g.strokeStyle = '#d49d2a'; g.lineWidth = Math.max(1.5, r * 0.07)
    g.beginPath(); g.arc(0, 0, r * 0.8, 0, Math.PI * 2); g.fill(); g.stroke()
    g.fillStyle = '#f2a541'
    g.beginPath(); g.ellipse(-r * 0.2, r * 0.15, r * 0.42, r * 0.26, -0.4, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#e8743b'
    g.beginPath(); g.moveTo(r * 0.72, -r * 0.12); g.lineTo(r * 1.05, 0); g.lineTo(r * 0.72, r * 0.12); g.closePath(); g.fill()
    eye(g, r * 0.35, -r * 0.25, r * 0.18)
  } else {
    g.fillStyle = '#2e2a26'
    g.beginPath(); g.arc(r * 0.62, 0, r * 0.36, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#e2483d'; g.strokeStyle = '#2e2a26'; g.lineWidth = Math.max(1.5, r * 0.07)
    g.beginPath(); g.ellipse(-r * 0.08, 0, r * 0.78, r * 0.68, 0, 0, Math.PI * 2); g.fill(); g.stroke()
    g.beginPath(); g.moveTo(r * 0.7, 0); g.lineTo(-r * 0.86, 0); g.stroke()
    g.fillStyle = '#2e2a26'
    for (const [dx, dy] of [[-0.35, -0.32], [-0.35, 0.32], [0.2, -0.3], [0.2, 0.3], [-0.7, 0.2]]) {
      g.beginPath(); g.arc(dx * r, dy * r, r * 0.12, 0, Math.PI * 2); g.fill()
    }
    eye(g, r * 0.78, -r * 0.14, r * 0.12)
  }
  g.restore()
}

const { wrap, canvas, toLocal } = useCanvas((g, w, h, now) => {
  background(g, w, h)
  if (!L.pads.length) return
  L.pads.forEach((p, i) => drawPad(g, p.x + (i === shakeIdx ? shakeOffset(shakeAt, now) : 0), p.y, L.size))
  const heroS = L.size * 0.72
  const target = L.pads[cur]
  let pos: Pt = target
  if (phase === 'hop') {
    const t = Math.min(1, (now - hopStart) / HOP_MS)
    const eased = t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)
    pos = hopPos(hopFrom, target, eased, Math.max(30, L.size * 0.7))
  }
  drawHero(g, pos.x, pos.y - L.size * 0.08, heroS, phase === 'hop' ? facing : 1)
  bursts.draw(g, now)
}, (w, h) => {
  relayout(w, h)
})

onMounted(startRound)
</script>

<template>
  <div ref="wrap" class="game">
    <canvas ref="canvas" class="cv" @pointerdown.prevent="onDown" />
  </div>
</template>

<style scoped>
.game { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
</style>
