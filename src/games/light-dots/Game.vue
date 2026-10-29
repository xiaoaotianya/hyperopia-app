<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { FADE_IN_MS, FADE_OUT_MS, checkInput, dotCount, makeSequence } from './logic'
import { BURST_MS, SHAKE_MS, clamp, useStageSize, useTimers } from '../_kit/canvas'
import DomBurst from '../_kit/DomBurst.vue'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const rng = createRng(Date.now())
const timers = useTimers()
const root = ref<HTMLElement | null>(null)
const size = useStageSize(root)

/** 3x3 网格里使用的位置：按灯数挑选对称的格子，看起来更整齐 */
const LAYOUTS: Record<number, number[]> = {
  1: [4], 2: [3, 5], 3: [3, 4, 5], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8],
  6: [0, 1, 2, 6, 7, 8], 7: [0, 1, 2, 4, 6, 7, 8], 8: [0, 1, 2, 3, 5, 6, 7, 8], 9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
}
const STEP_GAP_MS = 250

type Phase = 'demo' | 'input' | 'wait'
const phase = ref<Phase>('wait')
const count = ref(dotCount(props.level))
const lit = ref<Set<number>>(new Set())
const shaking = ref(-1)
const bursts = ref<{ id: number; x: number; y: number }[]>([])
let burstId = 0
let seq: number[] = []
let input: number[] = []

const cells = computed(() => LAYOUTS[count.value] ?? LAYOUTS[9])
const cellPx = computed(() => Math.min(size.w || 300, size.h || 300) / 3)
const dotPx = computed(() => clamp(cellPx.value * 0.66, 64, 150))

function setLit(i: number, on: boolean) {
  const s = new Set(lit.value)
  if (on) s.add(i); else s.delete(i)
  lit.value = s
}

function startRound() {
  // 判定之后才读取等级：此时父组件已传入新的 level
  count.value = dotCount(props.level)
  seq = makeSequence(props.level, rng)
  input = []
  lit.value = new Set()
  phase.value = 'demo'
  let t = 700
  for (const d of seq) {
    timers.later(() => setLit(d, true), t)
    timers.later(() => setLit(d, false), t + FADE_IN_MS)
    t += FADE_IN_MS + FADE_OUT_MS + STEP_GAP_MS
  }
  timers.later(() => { phase.value = 'input' }, t)
}

function onTap(i: number, e: PointerEvent) {
  if (phase.value !== 'input') return
  input.push(i)
  const r = checkInput(seq, input)
  if (r === 'wrong') {
    phase.value = 'wait'
    shaking.value = i
    timers.later(() => (shaking.value = -1), SHAKE_MS)
    emit('trial', false)
    timers.later(startRound, 1200)
    return
  }
  setLit(i, true)
  timers.later(() => setLit(i, false), FADE_IN_MS)
  if (r === 'done') {
    phase.value = 'wait'
    const box = root.value?.getBoundingClientRect()
    const el = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const id = ++burstId
    bursts.value.push({ id, x: el.left + el.width / 2 - (box?.left ?? 0), y: el.top + el.height / 2 - (box?.top ?? 0) })
    timers.later(() => (bursts.value = bursts.value.filter(b => b.id !== id)), BURST_MS)
    emit('trial', true)
    timers.later(startRound, 1500)
  }
}

onMounted(startRound)
</script>

<template>
  <div ref="root" class="game" :class="phase">
    <div class="grid" :style="{ width: `${cellPx * 3}px`, height: `${cellPx * 3}px` }">
      <template v-for="(pos, i) in cells" :key="i">
        <div
          class="dot"
          :class="{ lit: lit.has(i), shake: shaking === i }"
          :style="{
            width: `${dotPx}px`, height: `${dotPx}px`,
            left: `${(pos % 3) * cellPx + (cellPx - dotPx) / 2}px`,
            top: `${Math.floor(pos / 3) * cellPx + (cellPx - dotPx) / 2}px`,
          }"
          @pointerdown.prevent="onTap(i, $event)"
        >
          <div class="glow" />
        </div>
      </template>
    </div>
    <div class="hint" aria-hidden="true">{{ phase === 'demo' ? '👀' : phase === 'input' ? '👆' : '' }}</div>
    <DomBurst v-for="b in bursts" :key="b.id" :x="b.x" :y="b.y" />
  </div>
</template>

<style scoped>
.game {
  flex: 1; min-height: 0; position: relative; overflow: hidden; touch-action: none;
  display: flex; align-items: center; justify-content: center; background: #e6e1d6;
}
.grid { position: relative; }
.dot {
  position: absolute; border-radius: 50%; cursor: pointer;
  background: #cfc6b4; box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.08);
}
/* 渐亮 600ms、渐暗 400ms：过渡时长取目标状态上的设置 */
.glow {
  position: absolute; inset: -12%; border-radius: 50%; opacity: 0;
  background: radial-gradient(circle, #ffe08a 0 45%, rgba(255, 210, 110, 0.55) 60%, rgba(255, 210, 110, 0) 72%);
  transition: opacity 0.4s ease-in-out;
}
.dot.lit .glow { opacity: 1; transition: opacity 0.6s ease-in-out; }
.dot.shake { animation: nudge 0.3s ease-in-out; }
.hint { position: absolute; right: 16px; top: 8px; font-size: 40px; }
@keyframes nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(8px); } }
</style>
