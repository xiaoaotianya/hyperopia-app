<script setup lang="ts">
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { BURST_MS, FEEDBACK_MS, Fx, SHAKE_MS, useCanvasStage, useTimers, type StageSize } from '../canvasKit'
import { BALLOON_ARCMIN, SIGMA_RATIO, gaborValue, isCorrect, makeTrial, type Trial } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const MARGIN = 16
const MIN_HIT = 28
/** 每周期至少 3 个设备像素，避免高频光栅在低分辨率屏上混叠 */
const MIN_DEV_PX_PER_CYCLE = 3
const OUTLINE = '#b56f84'
const STRING = '#6d6d6d'

const rng = createRng(Date.now())
const fx = new Fx()
const timers = useTimers()
let trialIndex = 0
let trial: Trial = makeTrial(props.level, rng, trialIndex)
let D = 100
let centers: { x: number; y: number }[] = []
let patch: HTMLCanvasElement | null = null
let busy = false

function layout(s: StageSize) {
  const wanted = props.ctx.arcminToPx(BALLOON_ARCMIN)
  const sideBySide = s.w >= s.h * 0.8
  // 气球高 = D，下方线绳 0.6D
  const maxD = sideBySide
    ? Math.min((s.w - 3 * MARGIN) / 2, (s.h - 2 * MARGIN) / 1.6)
    : Math.min(s.w - 2 * MARGIN, (s.h - 3 * MARGIN) / 3.2)
  D = Math.max(20, Math.min(wanted, maxD))
  if (sideBySide) {
    const gap = Math.min(D * 0.8, (s.w - 2 * D) / 3)
    const cy = s.h / 2 - D * 0.3
    centers = [{ x: s.w / 2 - gap / 2 - D / 2, y: cy }, { x: s.w / 2 + gap / 2 + D / 2, y: cy }]
  } else {
    const gap = Math.min(D * 0.6, (s.h - 3.2 * D) / 3)
    const y0 = s.h / 2 - (gap + D * 1.6) / 2 - D * 0.3
    centers = [{ x: s.w / 2, y: y0 }, { x: s.w / 2, y: y0 + D * 1.6 + gap }]
  }
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
  const half = n / 2, r2 = half * half
  for (let y = 0; y < n; y++) {
    const dy = y + 0.5 - half
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - half
      const k = (y * n + x) * 4
      if (dx * dx + dy * dy > r2) { img.data[k + 3] = 0; continue }
      const v = gaborValue(dx, dy, c, pxPerCycle, sigma)
      img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  patch = cv
}

function drawBalloon(g: CanvasRenderingContext2D, s: StageSize, x: number, y: number, striped: boolean) {
  const r = D / 2
  if (striped && patch) {
    // 按设备像素对齐绘制，避免缩放插值改变光栅
    g.save()
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.drawImage(patch, Math.round((x - r) * s.dpr), Math.round((y - r) * s.dpr))
    g.restore()
  }
  const lw = Math.max(2, D * 0.035)
  g.lineWidth = lw
  g.strokeStyle = OUTLINE
  g.beginPath(); g.arc(x, y, r + lw / 2, 0, Math.PI * 2); g.stroke()
  // 气球结
  g.fillStyle = OUTLINE
  g.beginPath()
  g.moveTo(x, y + r + lw)
  g.lineTo(x - D * 0.06, y + r + lw + D * 0.08)
  g.lineTo(x + D * 0.06, y + r + lw + D * 0.08)
  g.closePath(); g.fill()
  // 线绳
  g.strokeStyle = STRING
  g.lineWidth = Math.max(1.5, D * 0.015)
  g.beginPath()
  const sy = y + r + lw + D * 0.08
  g.moveTo(x, sy)
  g.bezierCurveTo(x - D * 0.12, sy + D * 0.17, x + D * 0.12, sy + D * 0.34, x, sy + D * 0.5)
  g.stroke()
}

const stage = useCanvasStage((g, s, now) => {
  g.fillStyle = 'rgb(128,128,128)'
  g.fillRect(0, 0, s.w, s.h)
  centers.forEach((c, i) => drawBalloon(g, s, c.x + fx.shakeOffset(i, now), c.y, i === trial.side))
  fx.draw(g, now)
}, layout)
const { wrap, canvas } = stage

function next() {
  trialIndex++
  trial = makeTrial(props.level, rng, trialIndex)
  fx.clear()
  layout(stage.size)
  busy = false
  stage.redraw()
}

function onDown(e: PointerEvent) {
  if (busy || centers.length < 2) return
  const { x, y } = stage.pointerPos(e)
  const d = centers.map(c => Math.hypot(c.x - x, c.y - y))
  const i: 0 | 1 = d[0] <= d[1] ? 0 : 1
  if (d[i] > Math.max(D * 0.6, MIN_HIT)) return
  busy = true
  const ok = isCorrect(trial, i)
  if (ok) fx.burst(centers[i].x, centers[i].y, D / 2)
  else fx.shake(i)
  stage.animateFor(Math.max(BURST_MS, SHAKE_MS))
  emit('trial', ok)
  timers.after(FEEDBACK_MS, next)
}
</script>

<template>
  <div ref="wrap" class="game">
    <canvas ref="canvas" class="cv" @pointerdown.prevent="onDown" />
  </div>
</template>

<style scoped>
/* 中灰 128，与 Gabor 平均亮度一致 */
.game { flex: 1; min-height: 0; position: relative; overflow: hidden; background: #808080; }
.cv { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
</style>
