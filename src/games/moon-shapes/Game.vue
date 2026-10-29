<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { FEEDBACK_MS, Fx, starPath, useCanvasStage, useTimers, type StageSize } from '../canvasKit'
import { maybePraise } from '../praise'
import { isCorrect, luminance, makeTrial, sizeArcmin, type Shape, type Trial } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

/** LEA 风格实心形状（100×100 盒子），画布和按钮共用 */
const PATHS: Record<Shape, string> = {
  circle: 'M6 50 A44 44 0 1 0 94 50 A44 44 0 1 0 6 50 Z',
  square: 'M11 11 H89 V89 H11 Z',
  heart: 'M50 92 C22 70 5 54 5 32 C5 16 17 6 31 6 C40 6 47 11 50 19 C53 11 60 6 69 6 C83 6 95 16 95 32 C95 54 78 70 50 92 Z',
  house: 'M50 5 L95 46 H82 V93 H18 V46 H5 Z',
}
const LABEL: Record<Shape, string> = { circle: '圆形', square: '方形', heart: '心形', house: '房子' }
/** 漂浮周期 8 秒（远低于 3Hz） */
const FLOAT_MS = 8000
const FRAME_MS = 33

const rng = createRng(Date.now())
const fx = new Fx()
const timers = useTimers()
let trialIndex = 0
let trial: Trial = makeTrial(props.level, rng, trialIndex)
const options = ref<Shape[]>(trial.options)
let sizePx = 80
let lum = luminance(trial)
let busy = false
let lastFrame = 0
const path2d: Partial<Record<Shape, Path2D>> = {}
const getPath = (s: Shape) => (path2d[s] ??= new Path2D(PATHS[s]))

function layout(s: StageSize) {
  sizePx = Math.max(24, Math.min(props.ctx.arcminToPx(sizeArcmin(props.level)), Math.min(s.w, s.h) * 0.6))
}

function drawDecor(g: CanvasRenderingContext2D, s: StageSize) {
  const m = Math.min(s.w, s.h), u = Math.max(16, m * 0.06)
  g.save()
  // 角落里的小星星（静止，不闪）
  g.fillStyle = 'rgba(235,228,190,0.7)'
  for (const [x, y, r] of [[0.07, 0.08, 0.5], [0.22, 0.05, 0.35], [0.93, 0.92, 0.4], [0.06, 0.6, 0.3], [0.95, 0.4, 0.3]]) {
    starPath(g, s.w * x, s.h * y, u * r, 0.45); g.fill()
  }
  if (trial.theme === 'moon') {
    // 右上角弯月
    const x = s.w - u * 1.6, y = u * 1.6
    g.fillStyle = '#e6dfb4'
    g.beginPath(); g.arc(x, y, u, 0, Math.PI * 2); g.fill()
    g.fillStyle = 'rgb(128,128,128)'
    g.beginPath(); g.arc(x + u * 0.45, y - u * 0.25, u * 0.85, 0, Math.PI * 2); g.fill()
  } else if (trial.theme === 'owl') {
    // 左下角树枝上的猫头鹰
    const x = u * 1.8, y = s.h - u * 1.5
    g.strokeStyle = '#6b5640'; g.lineWidth = u * 0.25; g.lineCap = 'round'
    g.beginPath(); g.moveTo(0, y + u * 0.9); g.lineTo(x + u * 1.6, y + u * 0.75); g.stroke()
    g.fillStyle = '#8a6a4a'
    g.beginPath(); g.ellipse(x, y, u * 0.8, u * 0.95, 0, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.moveTo(x - u * 0.7, y - u * 0.6); g.lineTo(x - u * 0.55, y - u * 1.15); g.lineTo(x - u * 0.2, y - u * 0.8); g.fill()
    g.beginPath(); g.moveTo(x + u * 0.7, y - u * 0.6); g.lineTo(x + u * 0.55, y - u * 1.15); g.lineTo(x + u * 0.2, y - u * 0.8); g.fill()
    g.fillStyle = '#f2e6c4'
    g.beginPath(); g.arc(x - u * 0.32, y - u * 0.3, u * 0.27, 0, Math.PI * 2); g.arc(x + u * 0.32, y - u * 0.3, u * 0.27, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#2b2622'
    g.beginPath(); g.arc(x - u * 0.32, y - u * 0.3, u * 0.12, 0, Math.PI * 2); g.arc(x + u * 0.32, y - u * 0.3, u * 0.12, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#e0a63a'
    g.beginPath(); g.moveTo(x - u * 0.1, y - u * 0.1); g.lineTo(x + u * 0.1, y - u * 0.1); g.lineTo(x, y + u * 0.12); g.fill()
  } else {
    // 顶上挂着两盏小灯笼
    for (const fxp of [0.15, 0.85]) {
      const x = s.w * fxp, y = u * 1.6
      g.strokeStyle = '#5a5a5a'; g.lineWidth = 2
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, y - u * 0.6); g.stroke()
      g.fillStyle = '#c9584a'
      g.beginPath(); g.ellipse(x, y, u * 0.65, u * 0.55, 0, 0, Math.PI * 2); g.fill()
      g.fillStyle = '#e0b04a'
      g.fillRect(x - u * 0.3, y - u * 0.65, u * 0.6, u * 0.14)
      g.fillRect(x - u * 0.3, y + u * 0.5, u * 0.6, u * 0.14)
    }
  }
  g.restore()
}

const stage = useCanvasStage((g, s, now) => {
  if (now - lastFrame < FRAME_MS) return // 画布保留上一帧
  lastFrame = now
  g.fillStyle = 'rgb(128,128,128)'
  g.fillRect(0, 0, s.w, s.h)
  drawDecor(g, s)
  const bob = Math.min(8, sizePx * 0.04) * Math.sin((2 * Math.PI * now) / FLOAT_MS)
  const x = s.w / 2 + fx.shakeOffset('m', now, Math.max(5, sizePx * 0.05)), y = s.h / 2 + bob
  if (typeof Path2D !== 'undefined') {
    g.save()
    g.translate(x - sizePx / 2, y - sizePx / 2)
    g.scale(sizePx / 100, sizePx / 100)
    g.fillStyle = `rgb(${lum},${lum},${lum})`
    g.fill(getPath(trial.shape))
    g.restore()
  }
  fx.draw(g, now)
}, layout)
const { wrap, canvas } = stage

function next() {
  trialIndex++
  trial = makeTrial(props.level, rng, trialIndex)
  lum = luminance(trial)
  options.value = trial.options
  fx.clear()
  layout(stage.size)
  busy = false
}

function answer(sh: Shape) {
  if (busy) return
  busy = true
  const ok = isCorrect(trial, sh)
  const s = stage.size
  if (ok) { fx.burst(s.w / 2, s.h / 2, sizePx / 2); maybePraise(props.ctx) }
  else fx.shake('m')
  emit('trial', ok)
  timers.after(FEEDBACK_MS, next)
}

onMounted(() => stage.setContinuous(true))

</script>

<template>
  <div class="game">
    <div ref="wrap" class="view">
      <canvas ref="canvas" class="cv" />
    </div>
    <div class="answers">
      <button
        v-for="sh in options" :key="sh" type="button" class="btn" :aria-label="LABEL[sh]"
        @pointerdown.prevent="answer(sh)"
      >
        <svg viewBox="0 0 100 100" aria-hidden="true"><path :d="PATHS[sh]" fill="#26324f" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.game { flex: 1; min-height: 0; position: relative; display: flex; flex-direction: column; overflow: hidden; background: #808080; }
.view { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.cv { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
.answers { flex: none; display: flex; justify-content: center; gap: 10px; padding: 8px 12px 16px; }
.btn {
  --b: clamp(72px, 13vh, 120px);
  width: min(var(--b), calc((100vw - 64px) / 4)); min-width: 72px; aspect-ratio: 1; padding: 14px;
  border: none; border-radius: 22px; background: #efe9da; box-shadow: 0 4px 0 #5f5f5f; cursor: pointer; touch-action: none;
}
.btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #5f5f5f; }
.btn svg { width: 100%; height: 100%; display: block; }
</style>
