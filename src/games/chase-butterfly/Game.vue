<script setup lang="ts">
import { onMounted } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { GAP_MAX_MS, GAP_MIN_MS, dwellMs, makeTrial, position, sizeArcmin, type Trial } from './logic'
import { MIN_HIT_RADIUS, SHAKE_MS, StarBursts, clamp, shakeOffset, useCanvas, useTimers } from '../_kit/canvas'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const rng = createRng(Date.now())
const timers = useTimers()
const bursts = new StarBursts()

type State = 'gap' | 'show' | 'leaving'
let state: State = 'gap'
let trial: Trial | null = null
let sizePx = 60
let shownAt = 0          // performance.now() 时间
let shakeAt = 0
let dwellTimer: number | undefined

const FLOWER_R = 26

function now() { return performance.now() }

function butterflySize(w: number, h: number) {
  return clamp(props.ctx.arcminToPx(sizeArcmin(props.level)), 24, Math.min(w, h) * 0.3)
}

/** 蝴蝶中心：在 position() 基础上避开中间的花，并保证整只蝴蝶都在舞台内 */
function butterflyPos(w: number, h: number) {
  if (!trial) return { x: w / 2, y: h / 2 }
  let { x, y } = position(trial, w, h)
  const minD = FLOWER_R + sizePx * 0.7
  const dx = x - w / 2, dy = y - h / 2
  const d = Math.hypot(dx, dy)
  if (d < minD) {
    x = w / 2 + Math.cos(trial.angle) * minD
    y = h / 2 + Math.sin(trial.angle) * minD
  }
  const m = sizePx * 0.6 + 4
  return { x: clamp(x, m, w - m), y: clamp(y, m, h - m) }
}

function scheduleNext() {
  state = 'gap'
  trial = null
  timers.later(show, GAP_MIN_MS + rng() * (GAP_MAX_MS - GAP_MIN_MS))
}

function show() {
  trial = makeTrial(props.level, rng)
  sizePx = butterflySize(size.w || 300, size.h || 300)
  shownAt = now()
  shakeAt = 0
  state = 'show'
  dwellTimer = timers.later(onTimeout, dwellMs(props.level))
}

function onTimeout() {
  if (state !== 'show') return
  state = 'leaving'
  shakeAt = now()
  emit('trial', false)
  timers.later(scheduleNext, SHAKE_MS + 100)
}

function onPointerDown(e: PointerEvent) {
  if (state !== 'show' || !trial) return
  const p = toLocal(e)
  const b = butterflyPos(size.w, size.h)
  if (Math.hypot(p.x - b.x, p.y - b.y) > Math.max(sizePx, MIN_HIT_RADIUS)) return   // 没点中就忽略
  timers.cancel(dwellTimer)
  bursts.add(b.x, b.y, now(), sizePx * 0.7)
  state = 'gap'
  trial = null
  emit('trial', true)
  scheduleNext()
}

function drawFlower(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = '#e9a3b8'
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2
    g.beginPath()
    g.arc(x + Math.cos(a) * FLOWER_R * 0.55, y + Math.sin(a) * FLOWER_R * 0.55, FLOWER_R * 0.45, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = '#f2c14e'
  g.beginPath(); g.arc(x, y, FLOWER_R * 0.38, 0, Math.PI * 2); g.fill()
}

function drawButterfly(g: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, alpha: number) {
  // 翅膀开合：周期 1 秒，平滑余弦
  const flap = 0.675 + 0.325 * Math.cos((2 * Math.PI * t) / 1000)
  g.save()
  g.globalAlpha = alpha
  g.translate(x, y)
  for (const side of [-1, 1]) {
    g.save()
    g.scale(side * flap, 1)
    g.fillStyle = '#7fa7e0'
    g.beginPath(); g.ellipse(s * 0.24, -s * 0.16, s * 0.26, s * 0.22, -0.4, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#a58fd6'
    g.beginPath(); g.ellipse(s * 0.2, s * 0.18, s * 0.18, s * 0.15, 0.5, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#f2c14e'
    g.beginPath(); g.arc(s * 0.27, -s * 0.17, s * 0.07, 0, Math.PI * 2); g.fill()
    g.restore()
  }
  g.fillStyle = '#4b3f36'
  g.beginPath(); g.ellipse(0, 0, s * 0.06, s * 0.3, 0, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#4b3f36'
  g.lineWidth = Math.max(1.5, s * 0.025)
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(0, -s * 0.26); g.lineTo(-s * 0.12, -s * 0.44)
  g.moveTo(0, -s * 0.26); g.lineTo(s * 0.12, -s * 0.44)
  g.stroke()
  g.restore()
}

const { wrap, canvas, size, toLocal } = useCanvas((g, w, h, t) => {
  g.fillStyle = '#e4ecd6'
  g.fillRect(0, 0, w, h)
  drawFlower(g, w / 2, h / 2)
  if ((state === 'show' || state === 'leaving') && trial) {
    const b = butterflyPos(w, h)
    const appear = clamp((t - shownAt) / 250, 0, 1)
    const fade = state === 'leaving' ? clamp(1 - (t - shakeAt - SHAKE_MS) / 100, 0, 1) : 1
    drawButterfly(g, b.x + shakeOffset(shakeAt, t), b.y, sizePx * (0.7 + 0.3 * appear), t, appear * fade)
  }
  bursts.draw(g, t)
})

onMounted(scheduleNext)
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
