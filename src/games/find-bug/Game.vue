<script setup lang="ts">
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { FEEDBACK_MS, Fx, BURST_MS, SHAKE_MS, useCanvasStage, useTimers, type StageSize } from '../canvasKit'
import { isCorrect, makeTrial, sizeArcmin, spacingFactor, type Trial } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

/** 相邻瓢虫中心距下限（CSS px）：保证 3–5 岁的手指点得开 */
const MIN_PITCH = 36
const MIN_HIT = 28
const MARGIN = 16

// 斑点位置（单位：身体半径）
const SPOTS: Record<number, [number, number][]> = {
  1: [[0, 0.1]],
  2: [[-0.42, 0.05], [0.42, 0.05]],
  3: [[-0.42, -0.15], [0.42, -0.15], [0, 0.48]],
  4: [[-0.42, -0.2], [0.42, -0.2], [-0.38, 0.4], [0.38, 0.4]],
  5: [[-0.45, -0.25], [0.45, -0.25], [-0.42, 0.38], [0.42, 0.38], [0, 0.08]],
}

const rng = createRng(Date.now())
const fx = new Fx()
const timers = useTimers()
let trial: Trial = makeTrial(props.level, rng)
let sizePx = 0
let pos: { x: number; y: number }[] = []
let busy = false

function layout(s: StageSize) {
  const n = trial.count
  const availW = Math.max(1, s.w - 2 * MARGIN), availH = Math.max(1, s.h - 2 * MARGIN)
  let size = props.ctx.arcminToPx(sizeArcmin(props.level))
  let pitch = Math.max(size * spacingFactor(props.level), MIN_PITCH)
  // 选能放下的最“方”的网格
  let best = { cols: n, rows: 1, fit: 0 }
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    const fit = Math.min(availW / cols, availH / rows)
    if (fit > best.fit) best = { cols, rows, fit }
  }
  // 放不下：先压缩间距，再缩小瓢虫
  if (pitch > best.fit) {
    pitch = best.fit
    size = Math.min(size, pitch / 1.15)
  }
  sizePx = size
  const { cols, rows } = best
  const x0 = s.w / 2 - ((cols - 1) * pitch) / 2
  const y0 = s.h / 2 - ((rows - 1) * pitch) / 2
  const lastRowCount = n - (rows - 1) * cols
  pos = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols), c = i % cols
    // 最后一行居中
    const shift = r === rows - 1 ? ((cols - lastRowCount) * pitch) / 2 : 0
    return { x: x0 + c * pitch + shift, y: y0 + r * pitch }
  })
}

function drawBug(g: CanvasRenderingContext2D, x: number, y: number, size: number, spots: number) {
  const r = size / 2
  g.fillStyle = '#2b2622'
  g.beginPath(); g.arc(x, y - r * 0.82, r * 0.4, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#d8402f'
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#2b2622'
  for (const [sx, sy] of SPOTS[spots] ?? []) {
    g.beginPath(); g.arc(x + sx * r, y + sy * r, r * 0.18, 0, Math.PI * 2); g.fill()
  }
}

const stage = useCanvasStage((g, s, now) => {
  g.clearRect(0, 0, s.w, s.h)
  trial.spots.forEach((n, i) => {
    const p = pos[i]
    if (p) drawBug(g, p.x + fx.shakeOffset(i, now, Math.max(4, sizePx * 0.25)), p.y, sizePx, n)
  })
  fx.draw(g, now)
}, layout)
const { wrap, canvas } = stage

function next() {
  trial = makeTrial(props.level, rng)
  fx.clear()
  layout(stage.size)
  busy = false
  stage.redraw()
}

function onDown(e: PointerEvent) {
  if (busy || !pos.length) return
  const { x, y } = stage.pointerPos(e)
  let bi = -1, bd = Infinity
  pos.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; bi = i } })
  if (bi < 0 || bd > Math.max(sizePx, MIN_HIT)) return // 点在空白处不算
  busy = true
  const ok = isCorrect(trial, bi)
  if (ok) fx.burst(pos[bi].x, pos[bi].y, sizePx / 2)
  else fx.shake(bi)
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
.game { flex: 1; min-height: 0; position: relative; overflow: hidden; background: #e8eedb; border-radius: var(--radius); }
.cv { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
</style>
