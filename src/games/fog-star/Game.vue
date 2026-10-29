<script setup lang="ts">
import { onMounted } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { FEEDBACK_MS, Fx, starPath, useCanvasStage, useTimers, type StageSize } from '../canvasKit'
import { TIMEOUT_MS, fogAlpha, isHit, makeTrial, starArcmin, starContrast, type Trial } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const MIN_HIT = 28
const EDGE = 8
const FRAME_MS = 33 // 雾漂移很慢，约 30fps 足够，省电

const rng = createRng(Date.now())
const fx = new Fx()
const timers = useTimers()

// 雾块：大块柔和径向渐变，沿慢速李萨如轨迹漂移（周期 7–14 秒）
const blobs = Array.from({ length: 6 }, (_, i) => ({
  light: i % 2 === 0,
  cx: 0.15 + rng() * 0.7, cy: 0.15 + rng() * 0.7,
  ax: 0.15 + rng() * 0.15, ay: 0.12 + rng() * 0.15,
  px: 7000 + rng() * 7000, py: 7000 + rng() * 7000,
  ph: rng() * Math.PI * 2,
  r: 0.35 + rng() * 0.25,
}))

let trial: Trial = makeTrial(rng)
let sizePx = 40
let star = { x: 0, y: 0 }
let alpha = fogAlpha(props.level)
let lum = 0
let busy = false
let timeoutId: number | undefined
let lastFrame = 0

function layout(s: StageSize) {
  const lim = Math.max(12, Math.min(s.w, s.h) * 0.3)
  sizePx = Math.min(props.ctx.arcminToPx(starArcmin(props.level)), lim)
  const r = sizePx / 2 + EDGE
  star = {
    x: Math.min(Math.max(trial.x * s.w, r), Math.max(r, s.w - r)),
    y: Math.min(Math.max(trial.y * s.h, r), Math.max(r, s.h - r)),
  }
}

function setLevelParams() {
  alpha = fogAlpha(props.level)
  lum = Math.min(255, Math.round(128 * (1 + starContrast(props.level))))
}

const stage = useCanvasStage((g, s, now) => {
  if (now - lastFrame < FRAME_MS) return // 画布保留上一帧
  lastFrame = now
  g.fillStyle = 'rgb(128,128,128)'
  g.fillRect(0, 0, s.w, s.h)
  const span = Math.max(s.w, s.h)
  for (const b of blobs) {
    const x = (b.cx + b.ax * Math.sin((2 * Math.PI * now) / b.px + b.ph)) * s.w
    const y = (b.cy + b.ay * Math.cos((2 * Math.PI * now) / b.py + b.ph)) * s.h
    const rr = b.r * span
    const grad = g.createRadialGradient(x, y, 0, x, y, rr)
    const col = b.light ? '255,255,255' : '0,0,0'
    grad.addColorStop(0, `rgba(${col},${alpha})`)
    grad.addColorStop(1, `rgba(${col},0)`)
    g.fillStyle = grad
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2)
  }
  // 星星画在雾上面，亮度固定为 128 × (1 + 对比度)
  g.fillStyle = `rgb(${lum},${lum},${lum})`
  starPath(g, star.x + fx.shakeOffset('star', now, Math.max(4, sizePx * 0.15)), star.y, sizePx / 2, 0.45)
  g.fill()
  fx.draw(g, now)
}, layout)
const { wrap, canvas } = stage

function startTrial() {
  timers.cancel(timeoutId)
  timeoutId = timers.after(TIMEOUT_MS, () => judge(false))
}

function next() {
  trial = makeTrial(rng)
  setLevelParams()
  fx.clear()
  layout(stage.size)
  busy = false
  startTrial()
}

function judge(ok: boolean) {
  if (busy) return
  busy = true
  timers.cancel(timeoutId)
  if (ok) fx.burst(star.x, star.y, sizePx / 2)
  else fx.shake('star')
  emit('trial', ok)
  timers.after(FEEDBACK_MS, next)
}

function onDown(e: PointerEvent) {
  if (busy) return
  const { x, y } = stage.pointerPos(e)
  const s = stage.size
  const hit = isHit({ x: star.x / s.w, y: star.y / s.h }, x, y, s.w, s.h, sizePx, Math.max(sizePx, MIN_HIT))
  judge(hit)
}

setLevelParams()
onMounted(() => {
  stage.setContinuous(true)
  startTrial()
})
</script>

<template>
  <div ref="wrap" class="game">
    <canvas ref="canvas" class="cv" @pointerdown.prevent="onDown" />
  </div>
</template>

<style scoped>
.game { flex: 1; min-height: 0; position: relative; overflow: hidden; background: #808080; }
.cv { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
</style>
