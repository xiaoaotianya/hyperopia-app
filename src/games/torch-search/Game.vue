<script setup lang="ts">
import { onMounted } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { BURST_MS, FEEDBACK_MS, Fx, SHAKE_MS, useCanvasStage, useTimers, type StageSize } from '../canvasKit'
import { maybePraise } from '../praise'
import { TIMEOUT_MS, isCorrect, itemArcmin, makeTrial, scatter, type Theme, type Trial } from './logic'
import { drawItem } from './shapes'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const MIN_HIT = 28
/** 相邻物件中心距下限（CSS px），保证小手指点得开 */
const MIN_PITCH = 40
const PAD = 12
/** 超时后把目标圈出来给孩子看，停留久一点 */
const REVEAL_MS = 1400

const rng = createRng(Date.now())
const fx = new Fx()
const timers = useTimers()
let trial: Trial = makeTrial(props.level, rng)
let r = 20
let pos: { x: number; y: number; rot: number }[] = []
let card = { x: 0, y: 0, w: 0, h: 0 }
let scene = { x: 0, y: 0, w: 0, h: 0 }
let busy = false
let reveal = false
let timeoutId: number | undefined

const BG: Record<Theme, [string, string]> = {
  ocean: ['#cfe8f0', '#efe3c4'],
  forest: ['#e1eed0', '#cfe2b8'],
  toys: ['#f6eadb', '#ecdcc6'],
}

function layout(s: StageSize) {
  const cardH = Math.min(120, Math.max(84, Math.round(s.h * 0.13)))
  const cardW = Math.min(s.w - 2 * PAD, 260)
  card = { x: (s.w - cardW) / 2, y: 8, w: cardW, h: cardH }
  scene = { x: PAD, y: cardH + 20, w: Math.max(40, s.w - 2 * PAD), h: Math.max(40, s.h - cardH - 20 - PAD) }
  r = Math.max(3, props.ctx.arcminToPx(itemArcmin(props.level)) / 2)
  r = Math.min(r, Math.min(scene.w, scene.h) / 4)
  let minDist = Math.max(2 * r * 1.3, MIN_PITCH)
  const n = trial.items.length
  // 放不下：先压缩间距，再缩小物件
  let pts = scatter(n, scene.w, scene.h, r, minDist, rng)
  for (let k = 0; !pts && k < 40; k++) {
    if (minDist > 2 * r * 1.05) minDist = Math.max(2 * r * 1.05, minDist * 0.92)
    else { r *= 0.92; minDist = 2 * r * 1.05 }
    pts = scatter(n, scene.w, scene.h, r, minDist, rng)
  }
  pos = (pts ?? []).map(p => ({ x: scene.x + p.x, y: scene.y + p.y, rot: (rng() - 0.5) * 0.7 }))
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rr: number) {
  g.beginPath()
  g.moveTo(x + rr, y); g.arcTo(x + w, y, x + w, y + h, rr); g.arcTo(x + w, y + h, x, y + h, rr)
  g.arcTo(x, y + h, x, y, rr); g.arcTo(x, y, x + w, y, rr); g.closePath()
}

function drawScene(g: CanvasRenderingContext2D) {
  const { x, y, w, h } = scene
  g.save()
  roundRect(g, x, y, w, h, 20)
  const grad = g.createLinearGradient(0, y, 0, y + h)
  grad.addColorStop(0, BG[trial.theme][0]); grad.addColorStop(1, BG[trial.theme][1])
  g.fillStyle = grad; g.fill()
  g.clip()
  if (trial.theme === 'ocean') {
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 3
    for (let k = 1; k <= 3; k++) {
      const yy = y + (h * k) / 5
      g.beginPath()
      for (let xx = x; xx <= x + w; xx += 8) g.lineTo(xx, yy + 5 * Math.sin(xx / 30))
      g.stroke()
    }
  } else if (trial.theme === 'forest') {
    g.strokeStyle = 'rgba(80,130,60,0.25)'; g.lineWidth = 2; g.lineCap = 'round'
    for (let xx = x + 14; xx < x + w; xx += 46) {
      const yy = y + h - 6
      g.beginPath(); g.moveTo(xx - 6, yy - 12); g.lineTo(xx, yy); g.lineTo(xx + 6, yy - 12); g.stroke()
    }
  } else {
    g.fillStyle = 'rgba(200,160,120,0.16)'
    for (let yy = y; yy < y + h; yy += 56) g.fillRect(x, yy, w, 28)
  }
  g.restore()
}

function drawCard(g: CanvasRenderingContext2D) {
  const { x, y, w, h } = card
  g.save()
  roundRect(g, x, y, w, h, 18)
  g.fillStyle = '#fbf7ee'; g.fill()
  g.strokeStyle = '#e3b55b'; g.lineWidth = 4; g.stroke()
  g.font = `${Math.round(h * 0.42)}px sans-serif`
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText('🔦', x + h * 0.5, y + h / 2)
  g.fillText('👉', x + h * 1.2, y + h / 2)
  g.restore()
  drawItem(g, trial.target, x + w - h * 0.75, y + h / 2, h * 0.36)
}

const stage = useCanvasStage((g, s, now) => {
  g.clearRect(0, 0, s.w, s.h)
  drawCard(g)
  drawScene(g)
  trial.items.forEach((it, i) => {
    const p = pos[i]
    if (p) drawItem(g, it, p.x + fx.shakeOffset(i, now, Math.max(4, r * 0.3)), p.y, r, p.rot)
  })
  if (reveal) {
    const p = pos[trial.targetIndex]
    if (p) {
      g.save()
      g.strokeStyle = '#f2a541'; g.lineWidth = 5
      g.beginPath(); g.arc(p.x, p.y, Math.max(r * 1.5, 22), 0, Math.PI * 2); g.stroke()
      g.restore()
    }
  }
  fx.draw(g, now)
}, layout)
const { wrap, canvas } = stage

function startTimer() {
  timers.cancel(timeoutId)
  timeoutId = timers.after(TIMEOUT_MS, () => {
    if (busy) return
    busy = true
    reveal = true
    stage.redraw()
    emit('trial', false)
    timers.after(REVEAL_MS, next)
  })
}

function next() {
  trial = makeTrial(props.level, rng)
  reveal = false
  fx.clear()
  layout(stage.size)
  busy = false
  stage.redraw()
  startTimer()
}

function onDown(e: PointerEvent) {
  if (busy || !pos.length) return
  const { x, y } = stage.pointerPos(e)
  let bi = -1, bd = Infinity
  pos.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bi = i } })
  if (bi < 0 || bd > Math.max(r * 1.2, MIN_HIT)) return // 点在空白处不算
  busy = true
  timers.cancel(timeoutId)
  const ok = isCorrect(trial, bi)
  if (ok) { fx.burst(pos[bi].x, pos[bi].y, r); maybePraise(props.ctx) }
  else fx.shake(bi)
  stage.animateFor(Math.max(BURST_MS, SHAKE_MS))
  emit('trial', ok)
  timers.after(FEEDBACK_MS, next)
}

onMounted(startTimer)
</script>

<template>
  <div ref="wrap" class="game">
    <canvas ref="canvas" class="cv" @pointerdown.prevent="onDown" />
  </div>
</template>

<style scoped>
.game { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.cv { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
</style>
