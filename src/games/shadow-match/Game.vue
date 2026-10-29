<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { maybePraise } from '../praise'
import { BURST_MS, SHAKE_MS, clamp, useStageSize, useTimers } from '../_kit/canvas'
import DomBurst from '../_kit/DomBurst.vue'
import { makeTrial, sizeArcmin, type Pt, type Shape, type Trial } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const rng = createRng(Date.now())
const timers = useTimers()
const root = ref<HTMLElement | null>(null)
const size = useStageSize(root)

const trial = shallowRef<Trial>(makeTrial(props.level, rng))
const trialLevel = ref(props.level)
const trialId = ref(0)
type Mode = 'home' | 'drag' | 'snap' | 'back'
const mode = ref<Mode>('home')
const dragPos = ref<Pt>({ x: 0, y: 0 })
const snapIdx = ref(-1)
const shakeIdx = ref(-1)
const busy = ref(false)
const bursts = ref<{ id: number; x: number; y: number }[]>([])
let burstId = 0
let pointerId = -1
let grab: Pt = { x: 0, y: 0 }

const BG: Record<Trial['theme'], string> = {
  farm: 'linear-gradient(#cfe7f3 0 14%, #dcefc4 14% 100%)',
  jungle: 'linear-gradient(#cfe8c8, #9fcf8f)',
  sea: 'linear-gradient(#bfe3f2, #7fbfdc)',
}

const L = computed(() => {
  const w = size.w || 360, h = size.h || 480
  const n = trial.value.options.length
  const slotW = w / n
  const want = Math.max(60, props.ctx.arcminToPx(sizeArcmin(trialLevel.value)))
  const S = clamp(want, 60, Math.max(60, Math.min(slotW * 0.86, h * 0.34)))
  const shadows = trial.value.options.map((_, i) => ({ x: slotW * (i + 0.5), y: h * 0.3 }))
  return { S, shadows, home: { x: w / 2, y: h * 0.76 } }
})

const animalPos = computed<Pt>(() => {
  if (mode.value === 'drag') return dragPos.value
  if (mode.value === 'snap' && snapIdx.value >= 0) return L.value.shadows[snapIdx.value]
  return L.value.home
})

/** SVG 多边形 points 字符串（归一化坐标，viewBox -1..1） */
const pts = (p: Pt[]) => p.map(q => `${q.x.toFixed(4)},${q.y.toFixed(4)}`).join(' ')
const shapeOf = (i: number): Shape => trial.value.options[i].shape

function local(e: PointerEvent): Pt {
  const r = root.value?.getBoundingClientRect()
  return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
}

function onDown(e: PointerEvent) {
  if (busy.value || mode.value === 'drag') return
  const p = local(e)
  const a = animalPos.value
  grab = { x: p.x - a.x, y: p.y - a.y }
  dragPos.value = { ...a }
  mode.value = 'drag'
  pointerId = e.pointerId
  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* 忽略 */ }
}

function onMove(e: PointerEvent) {
  if (mode.value !== 'drag' || e.pointerId !== pointerId) return
  const p = local(e)
  const w = size.w || 360, h = size.h || 480
  dragPos.value = { x: clamp(p.x - grab.x, 0, w), y: clamp(p.y - grab.y, 0, h) }
}

function onUp(e: PointerEvent) {
  if (mode.value !== 'drag' || e.pointerId !== pointerId) return
  pointerId = -1
  try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* 忽略 */ }
  const p = dragPos.value
  const reach = Math.max(L.value.S * 0.6, 40)
  let hit = -1, best = Infinity
  L.value.shadows.forEach((s, i) => {
    const d = Math.hypot(p.x - s.x, p.y - s.y)
    if (d < reach && d < best) { best = d; hit = i }
  })
  if (hit < 0) { mode.value = 'back'; return }     // 没放到影子上：飘回去，不计判定
  if (hit === trial.value.answer) {
    snapIdx.value = hit
    mode.value = 'snap'
    busy.value = true
    const s = L.value.shadows[hit]
    const id = ++burstId
    bursts.value = [...bursts.value, { id, x: s.x, y: s.y }]
    timers.later(() => (bursts.value = bursts.value.filter(b => b.id !== id)), BURST_MS)
    maybePraise(props.ctx)
    emit('trial', true)
    timers.later(next, 1400)
  } else {
    shakeIdx.value = hit
    timers.later(() => (shakeIdx.value = -1), SHAKE_MS)
    mode.value = 'back'
    busy.value = true
    emit('trial', false)
    timers.later(next, 900)
  }
}

/** 系统打断了拖动（来电、手势等）：飘回原处，不计判定 */
function onCancel(e: PointerEvent) {
  if (mode.value !== 'drag' || e.pointerId !== pointerId) return
  pointerId = -1
  mode.value = 'back'
}

function next() {
  // 判定之后才读取等级：此时父组件已传入新的 level
  trialLevel.value = props.level
  trial.value = makeTrial(props.level, rng)
  trialId.value++          // 新的小动物直接出现在下方，不从影子上飘回来
  snapIdx.value = -1
  mode.value = 'home'
  busy.value = false
}

onMounted(() => { trialLevel.value = props.level })
</script>

<template>
  <div ref="root" class="game" :style="{ background: BG[trial.theme] }">
    <!-- 静态装饰（不参与判断） -->
    <svg class="deco" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
      <template v-if="trial.theme === 'farm'">
        <rect x="0" y="10" width="100" height="1.6" fill="#c9a77a" />
        <rect v-for="k in 10" :key="k" :x="k * 10 - 6" y="6" width="1.6" height="8" fill="#c9a77a" />
      </template>
      <template v-else-if="trial.theme === 'jungle'">
        <ellipse v-for="k in 6" :key="k" :cx="k * 17 - 8" :cy="k % 2 ? 3 : 97" rx="9" ry="4" fill="#6fae5f" opacity="0.5" />
      </template>
      <template v-else>
        <circle v-for="k in 8" :key="k" :cx="(k * 37) % 100" :cy="(k * 53) % 100" r="1.6" fill="none" stroke="#fff" stroke-width="0.4" opacity="0.6" />
      </template>
    </svg>

    <div
      v-for="(s, i) in L.shadows"
      :key="`s${i}`"
      class="item shadow"
      :class="{ shake: shakeIdx === i }"
      :style="{ width: `${L.S}px`, height: `${L.S}px`, left: `${s.x - L.S / 2}px`, top: `${s.y - L.S / 2}px` }"
    >
      <svg viewBox="-1 -1 2 2" class="sv">
        <circle r="0.98" fill="rgba(255,255,255,0.28)" />
        <g class="dark">
          <polygon v-for="part in shapeOf(i).parts" :key="part.name" :points="pts(part.pts)" />
        </g>
      </svg>
    </div>

    <div
      :key="`a${trialId}`"
      class="item animal"
      :class="{ dragging: mode === 'drag', snapped: mode === 'snap' }"
      :style="{
        width: `${L.S}px`, height: `${L.S}px`,
        transform: `translate(${animalPos.x - L.S / 2}px, ${animalPos.y - L.S / 2}px)`,
        '--hit': `${Math.max(0, (64 - L.S) / 2)}px`,
      }"
      @pointerdown.prevent="onDown"
      @pointermove.prevent="onMove"
      @pointerup="onUp"
      @pointercancel="onCancel"
    >
      <svg viewBox="-1 -1 2 2" class="sv">
        <polygon
          v-for="part in trial.animal.parts"
          :key="part.name"
          :points="pts(part.pts)"
          :fill="part.color"
          stroke="rgba(60,50,40,0.55)"
          stroke-width="1.5"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
        <circle :cx="trial.animal.eye.x" :cy="trial.animal.eye.y" r="0.06" fill="#2e2a26" />
      </svg>
    </div>

    <DomBurst v-for="b in bursts" :key="b.id" :x="b.x" :y="b.y" :r="L.S * 0.7" />
  </div>
</template>

<style scoped>
.game { flex: 1; min-height: 0; position: relative; overflow: hidden; touch-action: none; transition: background 0.6s; }
.deco { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.item { position: absolute; }
.sv { width: 100%; height: 100%; display: block; overflow: visible; }
.dark { fill: #3b3550; stroke: #3b3550; stroke-width: 1.5; stroke-linejoin: round; vector-effect: non-scaling-stroke; opacity: 0.82; }
.dark polygon { vector-effect: non-scaling-stroke; }
.shadow.shake { animation: nudge 0.3s ease-in-out; }
.animal {
  left: 0; top: 0; cursor: grab; touch-action: none; z-index: 3;
  transition: transform 0.5s ease-in-out; filter: drop-shadow(0 4px 2px rgba(0, 0, 0, 0.18));
}
/* 小图时把触控区域扩到 64px */
.animal::before { content: ''; position: absolute; inset: calc(-1 * var(--hit)); }
.animal.dragging { transition: none; cursor: grabbing; }
.animal.snapped { transition: transform 0.25s ease-out; filter: none; }
@keyframes nudge { 0%, 100% { translate: 0 0; } 50% { translate: 8px 0; } }
</style>
