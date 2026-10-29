<script setup lang="ts">
import { ref } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { BURST_MS, FEEDBACK_MS, Fx, SHAKE_MS, useCanvasStage, useTimers, type StageSize } from '../canvasKit'
import { maybePraise } from '../praise'
import { BUBBLE_ARCMIN, ORIENT_DEG, SIGMA_RATIO, answerOrient, isCorrect, makeTrial, orientedGabor, type Orient, type Trial } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const MARGIN = 16
/** 每周期至少 3 个设备像素，避免混叠 */
const MIN_DEV_PX_PER_CYCLE = 3

const rng = createRng(Date.now())
const fx = new Fx()
const timers = useTimers()
let trialIndex = 0
let trial: Trial = makeTrial(props.level, rng, trialIndex)
/** 按钮示意图（响应式，只在换题时变） */
const options = ref<[Orient, Orient]>(trial.options)
let D = 100
let center = { x: 0, y: 0 }
let patch: HTMLCanvasElement | null = null
let busy = false

function layout(s: StageSize) {
  const wanted = props.ctx.arcminToPx(BUBBLE_ARCMIN)
  // 行星主题的光环比泡泡宽 1.5 倍，横向多留空间
  D = Math.max(20, Math.min(wanted, s.h - 2 * MARGIN, (s.w - 2 * MARGIN) / 1.6))
  center = { x: s.w / 2, y: s.h / 2 }
  buildPatch(s)
}

/** 以设备像素生成 Gabor 圆形贴片（圆外透明） */
function buildPatch(s: StageSize) {
  if (typeof document === 'undefined') return
  const dpr = s.dpr
  const n = Math.max(2, Math.round(D * dpr))
  const cv = patch ?? document.createElement('canvas')
  cv.width = n; cv.height = n
  let g: CanvasRenderingContext2D | null = null
  try { g = cv.getContext('2d') } catch { g = null }
  if (!g) { patch = null; return }
  const img = g.createImageData(n, n)
  const pxPerCycle = Math.max(MIN_DEV_PX_PER_CYCLE, (props.ctx.pxPerDegree() * dpr) / trial.sf)
  const sigma = SIGMA_RATIO * D * dpr
  const c = trial.contrast
  const theta = ORIENT_DEG[answerOrient(trial)]
  const half = n / 2, r2 = half * half
  for (let y = 0; y < n; y++) {
    const dy = y + 0.5 - half
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - half
      const k = (y * n + x) * 4
      if (dx * dx + dy * dy > r2) { img.data[k + 3] = 0; continue }
      const v = orientedGabor(dx, dy, c, pxPerCycle, sigma, theta)
      img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  patch = cv
}

function drawDecor(g: CanvasRenderingContext2D, s: StageSize) {
  const m = Math.min(s.w, s.h)
  g.save()
  if (trial.theme === 'tank') {
    // 鱼缸：底部石子、角落小鱼、一串上升的小气泡
    g.fillStyle = 'rgba(160,140,110,0.45)'
    for (let x = 6; x < s.w; x += 22) { g.beginPath(); g.ellipse(x, s.h - 6, 11, 6, 0, 0, Math.PI * 2); g.fill() }
    const fx0 = s.w * 0.12, fy0 = s.h - Math.max(36, m * 0.12), fr = Math.max(12, m * 0.04)
    g.fillStyle = '#e98a3c'
    g.beginPath(); g.ellipse(fx0, fy0, fr * 1.3, fr * 0.8, 0, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.moveTo(fx0 - fr, fy0); g.lineTo(fx0 - fr * 2, fy0 - fr * 0.7); g.lineTo(fx0 - fr * 2, fy0 + fr * 0.7); g.closePath(); g.fill()
    g.fillStyle = '#2b2622'; g.beginPath(); g.arc(fx0 + fr * 0.6, fy0 - fr * 0.15, fr * 0.15, 0, Math.PI * 2); g.fill()
    g.strokeStyle = 'rgba(225,240,250,0.7)'; g.lineWidth = 2
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(s.w * 0.9, s.h * (0.85 - i * 0.12), 4 + i * 2, 0, Math.PI * 2); g.stroke() }
  } else if (trial.theme === 'planet') {
    g.fillStyle = 'rgba(250,240,190,0.8)'
    for (const [x, y, r] of [[0.08, 0.1, 3], [0.2, 0.06, 2], [0.9, 0.12, 3], [0.86, 0.9, 2.5], [0.1, 0.88, 2], [0.95, 0.5, 2]]) {
      g.beginPath(); g.arc(s.w * x, s.h * y, r, 0, Math.PI * 2); g.fill()
    }
  } else {
    // 肥皂泡：角落里几个小泡泡
    g.strokeStyle = 'rgba(230,220,250,0.7)'; g.lineWidth = 2
    for (const [x, y, r] of [[0.1, 0.15, 0.04], [0.16, 0.25, 0.02], [0.88, 0.82, 0.035], [0.82, 0.9, 0.018]]) {
      g.beginPath(); g.arc(s.w * x, s.h * y, m * r, 0, Math.PI * 2); g.stroke()
    }
  }
  g.restore()
}

function drawBubble(g: CanvasRenderingContext2D, s: StageSize, x: number, y: number) {
  const r = D / 2
  const lw = Math.max(3, D * 0.03)
  if (trial.theme === 'planet') {
    // 光环只画在泡泡外面，不遮住条纹
    g.save()
    g.beginPath(); g.rect(0, 0, s.w, s.h); g.arc(x, y, r + lw, 0, Math.PI * 2)
    g.clip('evenodd')
    g.strokeStyle = '#d9a65a'; g.lineWidth = Math.max(4, D * 0.05)
    g.beginPath(); g.ellipse(x, y, r * 1.45, r * 0.32, -0.3, 0, Math.PI * 2); g.stroke()
    g.restore()
  }
  if (patch) {
    // 按设备像素对齐绘制，避免缩放插值改变光栅
    g.save()
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.drawImage(patch, Math.round((x - r) * s.dpr), Math.round((y - r) * s.dpr))
    g.restore()
  }
  g.lineWidth = lw
  g.strokeStyle = trial.theme === 'soap' ? '#c9b6e8' : trial.theme === 'tank' ? '#9fd0e6' : '#c98a4a'
  g.beginPath(); g.arc(x, y, r + lw / 2, 0, Math.PI * 2); g.stroke()
  if (trial.theme === 'soap') {
    g.strokeStyle = '#f1c6d8'; g.lineWidth = lw * 0.6
    g.beginPath(); g.arc(x, y, r + lw * 1.2, Math.PI * 0.1, Math.PI * 0.7); g.stroke()
  }
  // 边上的小高光
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = lw * 0.8; g.lineCap = 'round'
  g.beginPath(); g.arc(x, y, r + lw / 2, Math.PI * 1.15, Math.PI * 1.35); g.stroke()
}

const stage = useCanvasStage((g, s, now) => {
  g.fillStyle = 'rgb(128,128,128)'
  g.fillRect(0, 0, s.w, s.h)
  drawDecor(g, s)
  drawBubble(g, s, center.x + fx.shakeOffset('b', now, Math.max(5, D * 0.04)), center.y)
  fx.draw(g, now)
}, layout)
const { wrap, canvas } = stage

function next() {
  trialIndex++
  trial = makeTrial(props.level, rng, trialIndex)
  options.value = trial.options
  fx.clear()
  layout(stage.size)
  busy = false
  stage.redraw()
}

function answer(i: 0 | 1) {
  if (busy) return
  busy = true
  const ok = isCorrect(trial, i)
  if (ok) { fx.burst(center.x, center.y, D / 2); maybePraise(props.ctx) }
  else fx.shake('b')
  stage.animateFor(Math.max(BURST_MS, SHAKE_MS))
  emit('trial', ok)
  timers.after(FEEDBACK_MS, next)
}

/** SVG 竖条纹图案需要旋转的角度（SVG 顺时针为正） */
const svgRot = (o: Orient) => 90 - ORIENT_DEG[o]
const LABEL: Record<Orient, string> = { vertical: '竖条纹', horizontal: '横条纹', oblique45: '斜条纹（右上）', oblique135: '斜条纹（左上）' }
</script>

<template>
  <div class="game">
    <div ref="wrap" class="view">
      <canvas ref="canvas" class="cv" />
    </div>
    <div class="answers">
      <button
        v-for="(o, i) in options" :key="`${i}-${o}`" type="button" class="btn" :aria-label="LABEL[o]"
        @pointerdown.prevent="answer(i as 0 | 1)"
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <pattern :id="`bs-stripe-${i}`" width="20" height="20" patternUnits="userSpaceOnUse" :patternTransform="`rotate(${svgRot(o)} 50 50)`">
              <rect width="20" height="20" fill="#f4f1ea" />
              <rect width="10" height="20" fill="#1f1d1a" />
            </pattern>
          </defs>
          <circle cx="50" cy="50" r="44" :fill="`url(#bs-stripe-${i})`" stroke="#1f1d1a" stroke-width="5" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.game { flex: 1; min-height: 0; position: relative; display: flex; flex-direction: column; overflow: hidden; background: #808080; }
.view { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.cv { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
.answers { flex: none; display: flex; justify-content: center; gap: clamp(24px, 8vw, 80px); padding: 8px 16px 16px; }
.btn {
  --b: clamp(88px, 15vh, 130px);
  width: var(--b); height: var(--b); padding: 8px; border: none; border-radius: 50%;
  background: #e9e4d8; box-shadow: 0 4px 0 #5f5f5f; cursor: pointer; touch-action: none;
}
.btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #5f5f5f; }
.btn svg { width: 100%; height: 100%; display: block; }
</style>
