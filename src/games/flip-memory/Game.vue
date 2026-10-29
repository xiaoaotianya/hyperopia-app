<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { maybePraise } from '../praise'
import { BURST_MS, SHAKE_MS, useStageSize, useTimers } from '../_kit/canvas'
import DomBurst from '../_kit/DomBurst.vue'
import { THEMES, chooseGrid, closeOpen, flip, initState, isCleared, makeBoard, previewMs, type MemState, type Theme } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const GAP = 10
const PAD = 16
const MISMATCH_MS = 1000

const rng = createRng(Date.now())
const timers = useTimers()
const root = ref<HTMLElement | null>(null)
const size = useStageSize(root)

type Phase = 'preview' | 'play' | 'busy' | 'clear'
const phase = ref<Phase>('preview')
const theme = shallowRef<Theme>(THEMES[0])
const state = shallowRef<MemState>(initState([], false))
const shaking = ref<number[]>([])
const bursts = ref<{ id: number; x: number; y: number }[]>([])
let burstId = 0
const boardId = ref(0)

const grid = computed(() => {
  const n = state.value.cards.length || 4
  const g = chooseGrid(n, Math.max(1, (size.w || 360) - 2 * PAD), Math.max(1, (size.h || 480) - 2 * PAD), GAP)
  return { cols: g.cols, card: Math.max(48, Math.min(g.card, 180)) }
})

const faceUp = (i: number) => phase.value === 'preview' || state.value.matched[i] || state.value.open.includes(i)

function newBoard() {
  // 清盘后才读取等级：此时父组件已传入新的 level
  const lv = props.level
  theme.value = THEMES[Math.floor(rng() * THEMES.length) % THEMES.length]
  // 预览不计入"见过"：只有孩子自己翻开过的牌，之后再翻错才算错，对 3–5 岁更友好
  state.value = initState(makeBoard(lv, rng, theme.value.faces.length), false)
  boardId.value++
  shaking.value = []
  phase.value = 'preview'
  timers.later(() => { phase.value = 'play' }, previewMs(lv))
}

function burstAt(el: Element) {
  const box = root.value?.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const id = ++burstId
  bursts.value = [...bursts.value, { id, x: r.left + r.width / 2 - (box?.left ?? 0), y: r.top + r.height / 2 - (box?.top ?? 0) }]
  timers.later(() => (bursts.value = bursts.value.filter(b => b.id !== id)), BURST_MS)
}

function tap(i: number, e: PointerEvent) {
  if (phase.value !== 'play') return
  const { state: next, event } = flip(state.value, i)
  if (event === 'ignored') return
  state.value = next
  if (event === 'first') return
  if (event === 'match') {
    burstAt(e.currentTarget as Element)
    maybePraise(props.ctx)
    emit('trial', true)
    if (isCleared(next)) {
      phase.value = 'clear'
      timers.later(newBoard, 2200)
    }
    return
  }
  // 翻错：两张都留一会儿再盖回去；只有“搭档见过却翻错”才算错
  phase.value = 'busy'
  if (event === 'mismatch-counted') {
    emit('trial', false)
    shaking.value = [...next.open]
    timers.later(() => (shaking.value = []), SHAKE_MS)
  }
  timers.later(() => {
    state.value = closeOpen(state.value)
    if (phase.value === 'busy') phase.value = 'play'
  }, MISMATCH_MS)
}

onMounted(newBoard)
</script>

<template>
  <div ref="root" class="game" :style="{ background: theme.bg }">
    <div class="grid" :style="{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.card}px)`, gap: `${GAP}px` }">
      <div
        v-for="(face, i) in state.cards"
        :key="`${boardId}-${i}`"
        role="button"
        class="card"
        :class="{ matched: state.matched[i], shake: shaking.includes(i) }"
        :style="{ width: `${grid.card}px`, height: `${grid.card}px` }"
        @pointerdown.prevent="tap(i, $event)"
      >
        <div class="inner" :class="{ up: faceUp(i) }">
          <div class="side back" :style="{ background: theme.back }"><span class="dot" /></div>
          <div class="side front" :style="{ fontSize: `${Math.round(grid.card * 0.56)}px` }">{{ theme.faces[face] }}</div>
        </div>
      </div>
    </div>
    <div class="hint" aria-hidden="true">{{ phase === 'preview' ? '👀' : '' }}</div>
    <div v-if="phase === 'clear'" class="party" aria-hidden="true">🎉</div>
    <DomBurst v-for="b in bursts" :key="b.id" :x="b.x" :y="b.y" />
  </div>
</template>

<style scoped>
.game {
  flex: 1; min-height: 0; position: relative; overflow: hidden; touch-action: none;
  display: flex; align-items: center; justify-content: center; transition: background 0.6s;
}
.grid { display: grid; justify-content: center; align-content: center; }
.card { position: relative; perspective: 800px; cursor: pointer; touch-action: none; }
.inner {
  position: absolute; inset: 0; transform-style: preserve-3d;
  transition: transform 0.5s ease-in-out;
}
.inner.up { transform: rotateY(180deg); }
.side {
  position: absolute; inset: 0; border-radius: 18px; backface-visibility: hidden; -webkit-backface-visibility: hidden;
  display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
}
.back {
  background-image: radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.28) 0 12%, transparent 13%),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.28) 0 12%, transparent 13%);
  border: 4px solid rgba(255, 255, 255, 0.55);
}
.dot { width: 30%; height: 30%; border-radius: 50%; background: rgba(255, 255, 255, 0.5); }
.front { background: var(--surface); border: 4px solid var(--line); transform: rotateY(180deg); line-height: 1; }
.card.matched .front { border-color: var(--primary); }
.card.matched { opacity: 0.8; transition: opacity 0.6s 0.4s; }
.card.shake { animation: nudge 0.3s ease-in-out; }
.hint { position: absolute; right: 16px; top: 8px; font-size: 40px; }
.party {
  position: absolute; left: 50%; top: 50%; font-size: 120px; pointer-events: none;
  animation: pop 1.2s ease-out both;
}
@keyframes pop {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
  40% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
@keyframes nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(8px); } }
</style>
