<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { maybePraise } from '../praise'
import { BURST_MS, useStageSize, useTimers } from '../_kit/canvas'
import DomBurst from '../_kit/DomBurst.vue'
import { MODEL_SHOW_MS, THEMES, gridSize, hidesModel, judge, makePattern, toggle, type ThemeId } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const GAP = 8
const PAD = 14
const MID = 28           // 两个网格之间的距离（放小箭头）

const rng = createRng(Date.now())
const timers = useTimers()
const root = ref<HTMLElement | null>(null)
const size = useStageSize(root)

const n = ref(gridSize(props.level))
const target = ref<number[]>([])
const chosen = ref<number[]>([])
const theme = ref<ThemeId>('star')
const modelHidden = ref(false)
const showAnswer = ref(false)
const busy = ref(false)
const bursts = ref<{ id: number; x: number; y: number }[]>([])
let burstId = 0
let hideTimer: number | undefined

const PALETTE: Record<ThemeId, { bg: string; cell: string; edge: string }> = {
  star: { bg: '#4b5a8a', cell: '#5f6fa3', edge: '#7a89bb' },
  candy: { bg: '#f5dbe3', cell: '#fbeef2', edge: '#e6b7c6' },
  flower: { bg: '#d6ebc2', cell: '#eaf5dd', edge: '#b5d39a' },
}

const cell = computed(() => {
  const w = size.w || 360, h = size.h || 600
  const perW = (w - 2 * PAD - (n.value - 1) * GAP) / n.value
  const perH = ((h - 2 * PAD - MID) / 2 - (n.value - 1) * GAP) / n.value
  return Math.max(64, Math.min(120, perW, perH))
})
const gridPx = computed(() => n.value * cell.value + (n.value - 1) * GAP)
const cells = computed(() => Array.from({ length: n.value * n.value }, (_, i) => i))

const starPts = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 0.4 : 0.9, a = -Math.PI / 2 + (i * Math.PI) / 5
  return `${(Math.cos(a) * r).toFixed(3)},${(Math.sin(a) * r).toFixed(3)}`
}).join(' ')
const petals = Array.from({ length: 5 }, (_, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
  return { x: Math.cos(a) * 0.45, y: Math.sin(a) * 0.45 }
})

function newTrial() {
  // 判定之后才读取等级：此时父组件已传入新的 level
  const lv = props.level
  n.value = gridSize(lv)
  target.value = makePattern(lv, rng)
  chosen.value = []
  theme.value = THEMES[Math.floor(rng() * THEMES.length) % THEMES.length]
  modelHidden.value = false
  showAnswer.value = false
  busy.value = false
  // 上一题没到 3 秒就答完时，它的隐藏定时器不能把这一题的样子提前藏起来
  timers.cancel(hideTimer)
  hideTimer = hidesModel(lv) ? timers.later(() => { modelHidden.value = true }, MODEL_SHOW_MS) : undefined
}

function tap(i: number, e: PointerEvent) {
  if (busy.value) return
  chosen.value = toggle(chosen.value, i)
  if (chosen.value.length !== target.value.length) return
  busy.value = true
  timers.cancel(hideTimer)
  if (judge(target.value, chosen.value)) {
    const box = root.value?.getBoundingClientRect()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const id = ++burstId
    bursts.value = [...bursts.value, { id, x: r.left + r.width / 2 - (box?.left ?? 0), y: r.top + r.height / 2 - (box?.top ?? 0) }]
    timers.later(() => (bursts.value = bursts.value.filter(b => b.id !== id)), BURST_MS)
    maybePraise(props.ctx)
    emit('trial', true)
    timers.later(newTrial, 1300)
  } else {
    emit('trial', false)
    // 轻轻提示正确位置，并重新显示样子
    timers.later(() => { showAnswer.value = true; modelHidden.value = false }, 300)
    timers.later(newTrial, 2000)
  }
}

onMounted(newTrial)
</script>

<template>
  <div ref="root" class="game" :class="theme" :style="{ background: PALETTE[theme].bg, '--cell': PALETTE[theme].cell, '--edge': PALETTE[theme].edge }">
    <div class="col">
      <div class="grid model" :class="{ hidden: modelHidden }" :style="{ width: `${gridPx}px`, gridTemplateColumns: `repeat(${n}, ${cell}px)`, gap: `${GAP}px` }">
        <div v-for="i in cells" :key="`m${i}`" class="cell" :style="{ height: `${cell}px` }">
          <svg v-if="target.includes(i)" viewBox="-1 -1 2 2" class="icon">
            <use :href="`#cp-${theme}`" />
          </svg>
        </div>
      </div>
      <div class="arrow" :style="{ height: `${MID}px` }" aria-hidden="true">
        <svg viewBox="0 0 40 20" width="40" height="20"><path d="M6 4 L20 16 L34 4" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </div>
      <div class="grid answer" :style="{ width: `${gridPx}px`, gridTemplateColumns: `repeat(${n}, ${cell}px)`, gap: `${GAP}px` }">
        <div
          v-for="i in cells"
          :key="`a${i}`"
          role="button"
          class="cell tap"
          :class="{ on: chosen.includes(i), hint: showAnswer && target.includes(i) }"
          :style="{ height: `${cell}px` }"
          @pointerdown.prevent="tap(i, $event)"
        >
          <svg viewBox="-1 -1 2 2" class="icon lit"><use :href="`#cp-${theme}`" /></svg>
        </div>
      </div>
    </div>

    <!-- 三种主题图标（由代码绘制） -->
    <svg width="0" height="0" class="defs" aria-hidden="true">
      <defs>
        <g id="cp-star">
          <polygon :points="starPts" fill="#f6d55c" stroke="#e0a92e" stroke-width="0.08" stroke-linejoin="round" />
        </g>
        <g id="cp-candy">
          <polygon points="-0.45,0 -0.92,-0.4 -0.92,0.4" fill="#f28cb1" />
          <polygon points="0.45,0 0.92,-0.4 0.92,0.4" fill="#f28cb1" />
          <circle r="0.5" fill="#ef5f91" />
          <path d="M-0.3 -0.3 Q0 0 0.3 -0.3 M-0.3 0.1 Q0 0.4 0.3 0.1" fill="none" stroke="#fbd3e2" stroke-width="0.1" stroke-linecap="round" />
        </g>
        <g id="cp-flower">
          <circle v-for="(p, k) in petals" :key="k" :cx="p.x" :cy="p.y" r="0.36" fill="#f7a8c4" />
          <circle r="0.3" fill="#f6c945" />
        </g>
      </defs>
    </svg>
    <DomBurst v-for="b in bursts" :key="b.id" :x="b.x" :y="b.y" />
  </div>
</template>

<style scoped>
.game {
  flex: 1; min-height: 0; position: relative; overflow: hidden; touch-action: none;
  display: flex; align-items: center; justify-content: center; transition: background 0.6s;
}
.col { display: flex; flex-direction: column; align-items: center; }
.grid { display: grid; }
.cell {
  position: relative; border-radius: 14px; background: var(--cell); border: 3px solid var(--edge);
  display: flex; align-items: center; justify-content: center;
}
.model .icon { transition: opacity 0.8s ease-in-out; }
.model.hidden .icon { opacity: 0; }
.icon { width: 72%; height: 72%; display: block; }
.tap { cursor: pointer; touch-action: none; }
.tap .lit { opacity: 0; transform: scale(0.6); transition: opacity 0.25s, transform 0.25s; }
.tap.on .lit { opacity: 1; transform: scale(1); }
.tap.hint { border-style: dashed; border-color: var(--primary); }
.tap.hint:not(.on) .lit { opacity: 0.45; transform: scale(0.85); }
.arrow { display: flex; align-items: center; justify-content: center; color: var(--edge); }
.star .arrow { color: #9aa7d6; }
.defs { position: absolute; }
</style>
