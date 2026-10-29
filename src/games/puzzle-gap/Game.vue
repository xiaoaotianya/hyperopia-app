<script setup lang="ts">
import type { GameContext } from '../types'
import { createRng, type Rng } from '../../core/random'
import { BURST_MS, FEEDBACK_MS, Fx, SHAKE_MS, useCanvasStage, useTimers, type StageSize } from '../canvasKit'
import { SECTOR_DEG, isCorrect, makeTrial, type Trial } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const FLY_MS = 550
const MIN_HIT = 40
const HALF = ((SECTOR_DEG / 2) * Math.PI) / 180
/** 扇形质心到圆心的距离（单位：半径） */
const CENTROID = ((2 / 3) * Math.sin(HALF)) / HALF
const rad = (deg: number) => (deg * Math.PI) / 180

const rng = createRng(Date.now())
const fx = new Fx()
const timers = useTimers()
let trial: Trial = makeTrial(props.level, rng)
let chips: { a: number; d: number; r: number }[] = makeChips(rng, trial.gapAngle)
let R = 60
let cookie = { x: 0, y: 0 }
let slots: { x: number; y: number }[] = []
let flying: { i: number; t0: number } | null = null
let landed = false
let busy = false

function makeChips(r: Rng, gap: number) {
  const out: { a: number; d: number; r: number }[] = []
  for (let tries = 0; out.length < 7 && tries < 200; tries++) {
    const a = r() * 360
    const diff = Math.abs(((a - gap + 540) % 360) - 180)
    if (diff < SECTOR_DEG / 2 + 18) continue // 缺口附近不放巧克力豆
    const c = { a, d: 0.25 + r() * 0.5, r: 0.07 + r() * 0.04 }
    const xy = (q: typeof c) => [Math.cos((q.a * Math.PI) / 180) * q.d, Math.sin((q.a * Math.PI) / 180) * q.d]
    const [x, y] = xy(c)
    if (out.some(o => { const [ox, oy] = xy(o); return Math.hypot(ox - x, oy - y) < o.r + c.r + 0.08 })) continue
    out.push(c)
  }
  return out
}

function layout(s: StageSize) {
  const n = trial.candidates.length
  // 候选块与缺口一样大；按宽、高两个方向夹紧，保证放得下
  // 竖直方向：饼干 2.1R + 间隔 0.35R + 候选块（质心上下各约 0.64R）+ 上下边距 16
  R = Math.max(20, Math.min(130, s.w / (n * 1.65), (s.h - 32) / 3.8, (s.w - 32) / 2.2))
  const top = 16 + Math.max(0, (s.h - 32 - R * 3.75) / 2) // 有富余时整体竖直居中
  cookie = { x: s.w / 2, y: top + R * 1.05 }
  const rowY = top + R * (2.1 + 0.35 + 0.64)
  const cellW = s.w / n
  slots = trial.candidates.map((_, i) => ({ x: cellW * (i + 0.5), y: rowY }))
}

/** 以质心 (cx,cy) 画朝向 angle 的扇形块 */
function sectorPath(g: CanvasRenderingContext2D, apexX: number, apexY: number, r: number, angleDeg: number) {
  const a = rad(angleDeg)
  g.beginPath()
  g.moveTo(apexX, apexY)
  g.arc(apexX, apexY, r, a - HALF, a + HALF)
  g.closePath()
}
function apexFromCentroid(cx: number, cy: number, r: number, angleDeg: number) {
  const a = rad(angleDeg)
  return { x: cx - Math.cos(a) * CENTROID * r, y: cy - Math.sin(a) * CENTROID * r }
}

function drawPiece(g: CanvasRenderingContext2D, apexX: number, apexY: number, angleDeg: number) {
  sectorPath(g, apexX, apexY, R, angleDeg)
  g.fillStyle = '#dca660'
  g.fill()
  g.lineWidth = Math.max(2, R * 0.05)
  g.strokeStyle = '#a8732f'
  g.lineJoin = 'round'
  g.stroke()
}

const stage = useCanvasStage((g, s, now) => {
  g.clearRect(0, 0, s.w, s.h)
  const gapA = trial.gapAngle
  // 饼干（缺一个 60° 扇形）
  g.beginPath()
  g.moveTo(cookie.x, cookie.y)
  g.arc(cookie.x, cookie.y, R, rad(gapA) + HALF, rad(gapA) - HALF + Math.PI * 2)
  g.closePath()
  g.fillStyle = '#dca660'
  g.fill()
  g.lineWidth = Math.max(2, R * 0.05)
  g.strokeStyle = '#a8732f'
  g.lineJoin = 'round'
  g.stroke()
  g.fillStyle = '#6b4226'
  for (const c of chips) {
    g.beginPath()
    g.arc(cookie.x + Math.cos(rad(c.a)) * c.d * R, cookie.y + Math.sin(rad(c.a)) * c.d * R, c.r * R, 0, Math.PI * 2)
    g.fill()
  }
  // 缺口轮廓（虚线）
  if (!landed) {
    g.save()
    sectorPath(g, cookie.x, cookie.y, R, gapA)
    g.setLineDash([6, 6])
    g.strokeStyle = 'rgba(168,115,47,0.55)'
    g.lineWidth = 2
    g.stroke()
    g.restore()
  }
  // 候选块
  trial.candidates.forEach((ang, i) => {
    const sl = slots[i]
    if (!sl) return
    if (flying && flying.i === i) return
    const ap = apexFromCentroid(sl.x + fx.shakeOffset(i, now), sl.y, R, ang)
    drawPiece(g, ap.x, ap.y, ang)
  })
  // 飞向缺口的那块
  if (flying) {
    const sl = slots[flying.i]
    const p = Math.min(1, (now - flying.t0) / FLY_MS)
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
    const start = apexFromCentroid(sl.x, sl.y, R, gapA)
    drawPiece(g, start.x + (cookie.x - start.x) * e, start.y + (cookie.y - start.y) * e, gapA)
  }
  fx.draw(g, now)
}, layout)
const { wrap, canvas } = stage

function next() {
  trial = makeTrial(props.level, rng)
  chips = makeChips(rng, trial.gapAngle)
  flying = null
  landed = false
  fx.clear()
  layout(stage.size)
  busy = false
  stage.redraw()
}

function onDown(e: PointerEvent) {
  if (busy || !slots.length) return
  const { x, y } = stage.pointerPos(e)
  let bi = -1, bd = Infinity
  slots.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bi = i } })
  if (bi < 0 || bd > Math.max(R * 0.8, MIN_HIT)) return
  busy = true
  const ok = isCorrect(trial, bi)
  emit('trial', ok)
  if (ok) {
    flying = { i: bi, t0: performance.now() }
    stage.animateFor(FLY_MS)
    timers.after(FLY_MS, () => {
      landed = true
      const a = rad(trial.gapAngle)
      fx.burst(cookie.x + Math.cos(a) * CENTROID * R, cookie.y + Math.sin(a) * CENTROID * R, R * 0.5)
      stage.animateFor(BURST_MS)
    })
    timers.after(FLY_MS + FEEDBACK_MS, next)
  } else {
    fx.shake(bi)
    stage.animateFor(SHAKE_MS)
    timers.after(FEEDBACK_MS, next)
  }
}
</script>

<template>
  <div ref="wrap" class="game">
    <canvas ref="canvas" class="cv" @pointerdown.prevent="onDown" />
  </div>
</template>

<style scoped>
.game { flex: 1; min-height: 0; position: relative; overflow: hidden; background: #efe6d3; border-radius: var(--radius); }
.cv { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
</style>
