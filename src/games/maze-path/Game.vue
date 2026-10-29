<script setup lang="ts">
import { onMounted } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { makePath, nearestOnPolyline, widthArcmin, type Pt } from './logic'
import { MIN_HIT_RADIUS, StarBursts, clamp, shakeOffset, useCanvas, useTimers } from '../_kit/canvas'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const rng = createRng(Date.now())
const timers = useTimers()
const bursts = new StarBursts()

let norm: Pt[] = []            // 归一化路径
let px: Pt[] = []              // 像素路径
let pathW = 60                 // 路宽（px）
let bunny: Pt = { x: 0, y: 0 }
let reached = 0                // 已通过的最后一个路点
let dragging = false
let pointerId = -1
let busy = false               // 到家后等待换新路径
let shakeAt = 0
let lastW = 0, lastH = 0

const bunnySize = () => clamp(pathW * 1.1, 36, 72)

function layout(w: number, h: number) {
  const ow = lastW, oh = lastH
  lastW = w; lastH = h
  if (!norm.length) return
  const had = px.length > 0
  // 竖屏时宽度很窄：路宽同时受宽、高限制，起点/终点内缩，保证小兔和房子完整显示
  pathW = clamp(props.ctx.arcminToPx(widthArcmin(props.level)), 24, Math.min(h * 0.25, w * 0.2))
  const edge = bunnySize() * 0.6 + 4
  px = norm.map(p => ({ x: clamp(p.x * w, edge, w - edge), y: p.y * h }))
  // 尺寸变化时按比例搬动小兔
  if (had && ow > 0 && oh > 0) bunny = { x: (bunny.x * w) / ow, y: (bunny.y * h) / oh }
  else bunny = { ...px[0] }
}

function newPath() {
  // 此时读取 props.level：判定后父组件已经传入新等级
  norm = makePath(props.level, rng)
  px = []
  reached = 0
  dragging = false
  busy = false
  layout(lastW || 300, lastH || 300)
  bunny = { ...px[0] }
}

function onDown(e: PointerEvent) {
  if (busy || dragging || !px.length) return
  const p = toLocal(e)
  if (Math.hypot(p.x - bunny.x, p.y - bunny.y) > Math.max(bunnySize() * 0.8, pathW / 2, MIN_HIT_RADIUS)) return
  dragging = true
  pointerId = e.pointerId
  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* 忽略 */ }
}

function release(e: PointerEvent) {
  if (e.pointerId !== pointerId) return
  dragging = false
  pointerId = -1
  try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* 忽略 */ }
}

function onMove(e: PointerEvent) {
  if (!dragging || e.pointerId !== pointerId || busy) return
  const p = toLocal(e)
  const near = nearestOnPolyline(p, px)
  if (near.dist > pathW / 2) {
    // 出界：小兔弹回最近通过的路点，本次出界只计 1 次错误（需要重新按住小兔才能继续）
    bunny = { ...px[reached] }
    shakeAt = performance.now()
    release(e)
    emit('trial', false)
    return
  }
  if (near.seg > reached + 1) return          // 不允许跳过路段
  bunny = p
  if (near.seg > reached) reached = near.seg
  const home = px[px.length - 1]
  if (reached >= px.length - 2 && Math.hypot(p.x - home.x, p.y - home.y) < Math.max(pathW / 2, 28)) {
    bunny = { ...home }
    busy = true
    release(e)
    bursts.add(home.x, home.y, performance.now(), bunnySize())
    emit('trial', true)
    timers.later(newPath, 1000)
  }
}

function drawEmoji(g: CanvasRenderingContext2D, ch: string, x: number, y: number, s: number) {
  g.font = `${Math.round(s)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(ch, x, y)
}

const { wrap, canvas, toLocal } = useCanvas((g, w, h, now) => {
  g.fillStyle = '#dfe9cf'
  g.fillRect(0, 0, w, h)
  if (!px.length) return
  g.lineJoin = 'round'; g.lineCap = 'round'
  g.beginPath()
  px.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
  g.strokeStyle = '#c9b48c'
  g.lineWidth = pathW + 6
  g.stroke()
  g.strokeStyle = '#efe2c4'
  g.lineWidth = pathW
  g.stroke()
  g.strokeStyle = 'rgba(160, 135, 95, 0.45)'
  g.lineWidth = 2
  g.setLineDash([8, 10])
  g.stroke()
  g.setLineDash([])
  const home = px[px.length - 1]
  const s = bunnySize()
  drawEmoji(g, '🏠', home.x, home.y, s * 1.1)
  if (!busy) drawEmoji(g, '🐰', bunny.x + shakeOffset(shakeAt, now), bunny.y, s)
  bursts.draw(g, now)
}, layout)

onMounted(newPath)
</script>

<template>
  <div ref="wrap" class="game">
    <canvas
      ref="canvas"
      class="cv"
      @pointerdown.prevent="onDown"
      @pointermove.prevent="onMove"
      @pointerup="release"
      @pointercancel="release"
    />
  </div>
</template>

<style scoped>
.game { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
</style>
