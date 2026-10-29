<script setup lang="ts">
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { BURST_MS, FEEDBACK_MS, Fx, SHAKE_MS, useCanvasStage, useTimers, type StageSize } from '../canvasKit'
import { maybePraise } from '../praise'
import { isCorrect, makeTrial, sizeArcmin, type Dir, type Theme, type Trial } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

/** 目标至少 6 个设备像素，否则形状无法分辨 */
const MIN_DEV_PX = 6

const rng = createRng(Date.now())
const fx = new Fx()
const timers = useTimers()
let trial: Trial = makeTrial(props.level, rng)
let sizePx = 20
let busy = false

const BG: Record<Theme, [string, string]> = {
  fish: ['#d8eef5', '#bfe1ec'],
  bird: ['#e4eef8', '#d3e3f2'],
  car: ['#e6eedc', '#d6e2c8'],
}
/** 刺激颜色：深色，保证在浅色背景上高对比（这是视力题，不是对比度题） */
const INK: Record<Theme, string> = { fish: '#b8410f', bird: '#264a8c', car: '#a3152e' }

function layout(s: StageSize) {
  const want = Math.max(props.ctx.arcminToPx(sizeArcmin(props.level)), MIN_DEV_PX / s.dpr)
  // 3×3 拥挤阵列要放得下
  const span = 1 + 2 * trial.spacing
  sizePx = Math.min(want, (Math.min(s.w, s.h) * 0.8) / span)
}

/** 朝右的单位形状（长度 1，x∈[-0.5,0.5]） */
function shapePath(g: CanvasRenderingContext2D, theme: Theme) {
  g.beginPath()
  if (theme === 'fish') {
    g.ellipse(0.08, 0, 0.36, 0.24, 0, 0, Math.PI * 2)
    // 尾巴与身体同向环绕，nonzero 填充时重叠处不会被抵消
    g.moveTo(-0.2, 0)
    g.lineTo(-0.5, 0.24)
    g.lineTo(-0.42, 0)
    g.lineTo(-0.5, -0.24)
    g.closePath()
  } else if (theme === 'bird') {
    // 圆头在前、尾巴分叉在后的水滴形 + 尖嘴
    g.moveTo(0.38, -0.06)
    g.lineTo(0.5, 0.02)
    g.lineTo(0.37, 0.08)
    g.arc(0.16, 0, 0.23, 0.35, Math.PI * 0.62)
    g.lineTo(-0.5, 0.2)
    g.lineTo(-0.4, 0.02)
    g.lineTo(-0.5, -0.14)
    g.arc(0.16, 0, 0.23, Math.PI * 1.25, Math.PI * 1.86)
    g.closePath()
  } else {
    // 楔形赛车：车尾高（尾翼），车头低而尖
    g.moveTo(-0.5, -0.26)
    g.lineTo(-0.36, -0.26)
    g.lineTo(-0.33, -0.06)
    g.lineTo(-0.05, -0.16)
    g.lineTo(0.12, -0.05)
    g.lineTo(0.5, 0.04)
    g.lineTo(0.5, 0.14)
    g.lineTo(-0.5, 0.14)
    g.closePath()
    g.moveTo(-0.2, 0.15); g.arc(-0.3, 0.15, 0.1, 0, Math.PI * 2)
    g.moveTo(0.38, 0.15); g.arc(0.28, 0.15, 0.1, 0, Math.PI * 2)
  }
}

function drawCritter(g: CanvasRenderingContext2D, theme: Theme, x: number, y: number, L: number, dir: Dir) {
  g.save()
  g.translate(x, y)
  // 左：镜像（不倒立）；上下：旋转
  if (dir === 'left') g.scale(-L, L)
  else { g.rotate(dir === 'right' ? 0 : dir === 'down' ? Math.PI / 2 : -Math.PI / 2); g.scale(L, L) }
  shapePath(g, theme)
  g.fillStyle = INK[theme]
  g.fill('nonzero')
  // 大尺寸时才画眼睛等细节（不影响轮廓判断）
  if (L >= 24) {
    g.fillStyle = '#fff8e8'
    const eye = theme === 'fish' ? [0.27, -0.06] : theme === 'bird' ? [0.24, -0.06] : [0.0, -0.09]
    g.beginPath(); g.arc(eye[0], eye[1], theme === 'car' ? 0.06 : 0.055, 0, Math.PI * 2); g.fill()
    if (theme !== 'car') {
      g.fillStyle = '#1d1d1d'
      g.beginPath(); g.arc(eye[0] + 0.01, eye[1], 0.028, 0, Math.PI * 2); g.fill()
    }
  }
  g.restore()
}

function drawDecor(g: CanvasRenderingContext2D, s: StageSize, theme: Theme) {
  const grad = g.createLinearGradient(0, 0, 0, s.h)
  grad.addColorStop(0, BG[theme][0]); grad.addColorStop(1, BG[theme][1])
  g.fillStyle = grad
  g.fillRect(0, 0, s.w, s.h)
  const m = Math.min(s.w, s.h)
  g.save()
  if (theme === 'fish') {
    // 角落的水草和气泡
    g.strokeStyle = 'rgba(70,140,110,0.35)'; g.lineWidth = Math.max(4, m * 0.015); g.lineCap = 'round'
    for (let i = 0; i < 3; i++) {
      const x = s.w * 0.06 + i * m * 0.04
      g.beginPath(); g.moveTo(x, s.h)
      g.bezierCurveTo(x - m * 0.04, s.h - m * 0.1, x + m * 0.04, s.h - m * 0.16, x, s.h - m * (0.22 + i * 0.04)); g.stroke()
    }
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2
    for (const [fx0, fy0, fr] of [[0.9, 0.82, 0.03], [0.93, 0.7, 0.02], [0.88, 0.6, 0.014]]) {
      g.beginPath(); g.arc(s.w * fx0, s.h * fy0, m * fr, 0, Math.PI * 2); g.stroke()
    }
  } else if (theme === 'bird') {
    g.fillStyle = 'rgba(255,255,255,0.75)'
    for (const [cx, cy, r] of [[0.14, 0.12, 0.05], [0.84, 0.1, 0.04], [0.8, 0.88, 0.035]]) {
      const x = s.w * cx, y = s.h * cy, rr = m * r
      g.beginPath()
      g.arc(x, y, rr, 0, Math.PI * 2); g.arc(x + rr, y + rr * 0.2, rr * 0.8, 0, Math.PI * 2); g.arc(x - rr, y + rr * 0.25, rr * 0.7, 0, Math.PI * 2)
      g.fill()
    }
  } else {
    // 底部马路
    const rh = Math.max(18, m * 0.06)
    g.fillStyle = 'rgba(90,90,90,0.18)'
    g.fillRect(0, s.h - rh, s.w, rh)
    g.fillStyle = 'rgba(255,255,255,0.6)'
    for (let x = 10; x < s.w; x += 60) g.fillRect(x, s.h - rh / 2 - 2, 30, 4)
    g.fillStyle = 'rgba(120,160,90,0.3)'
    g.beginPath(); g.arc(s.w * 0.08, s.h * 0.12, m * 0.05, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.arc(s.w * 0.92, s.h * 0.12, m * 0.04, 0, Math.PI * 2); g.fill()
  }
  g.restore()
}

const stage = useCanvasStage((g, s, now) => {
  drawDecor(g, s, trial.theme)
  const cx = s.w / 2 + fx.shakeOffset('t', now, Math.max(4, sizePx * 0.3)), cy = s.h / 2
  const pitch = sizePx * trial.spacing
  for (const f of trial.flankers) drawCritter(g, trial.theme, cx + f.dx * pitch, cy + f.dy * pitch, sizePx, f.dir)
  drawCritter(g, trial.theme, cx, cy, sizePx, trial.dir)
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

function answer(d: Dir) {
  if (busy) return
  busy = true
  const ok = isCorrect(trial, d)
  const s = stage.size
  if (ok) { fx.burst(s.w / 2, s.h / 2, Math.max(sizePx, 20)); maybePraise(props.ctx) }
  else fx.shake('t')
  stage.animateFor(Math.max(BURST_MS, SHAKE_MS))
  emit('trial', ok)
  timers.after(FEEDBACK_MS, next)
}

const ARROWS: { dir: Dir; label: string; rot: number }[] = [
  { dir: 'up', label: '上', rot: -90 },
  { dir: 'left', label: '左', rot: 180 },
  { dir: 'right', label: '右', rot: 0 },
  { dir: 'down', label: '下', rot: 90 },
]
</script>

<template>
  <div class="game">
    <div ref="wrap" class="view">
      <canvas ref="canvas" class="cv" />
    </div>
    <div class="pad">
      <button
        v-for="a in ARROWS" :key="a.dir" type="button" :class="['btn', a.dir]" :aria-label="a.label"
        @pointerdown.prevent="answer(a.dir)"
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <g :transform="`rotate(${a.rot} 50 50)`">
            <path d="M14 40 H56 V20 L88 50 L56 80 V60 H14 Z" fill="#2d2a26" stroke="#2d2a26" stroke-width="6" stroke-linejoin="round" />
          </g>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.game { flex: 1; min-height: 0; position: relative; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.view { flex: 1; min-height: 0; position: relative; overflow: hidden; border-radius: var(--radius); }
.cv { position: absolute; left: 0; top: 0; display: block; touch-action: none; }
.pad {
  --b: clamp(72px, 11vh, 100px);
  flex: none; align-self: center; display: grid; gap: 6px; padding: 4px 0 8px;
  grid-template-columns: repeat(3, var(--b)); grid-template-rows: repeat(3, var(--b));
  grid-template-areas: ". up ." "left . right" ". down .";
}
.btn {
  border: none; border-radius: 22px; background: #f6d77a; box-shadow: 0 4px 0 #c9a443;
  display: flex; align-items: center; justify-content: center; padding: 12px; cursor: pointer; touch-action: none;
}
.btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #c9a443; }
.btn svg { width: 100%; height: 100%; }
.up { grid-area: up; } .down { grid-area: down; } .left { grid-area: left; } .right { grid-area: right; }
@media (orientation: landscape) {
  .game { flex-direction: row; }
  .pad { --b: clamp(72px, 13vh, 110px); padding: 0 8px 0 0; }
}
</style>
