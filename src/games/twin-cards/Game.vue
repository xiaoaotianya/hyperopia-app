<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { FEEDBACK_MS } from '../canvasKit'
import { cellArcmin, isCorrect, makeTrial, type Trial } from './logic'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const MIN_CARD = 72   // 触控目标下限（px）
const CARD_GAP = 12
const PAD = 16

const rng = createRng(Date.now())
const trial = shallowRef<Trial>(makeTrial(props.level, rng))
const picked = ref<number | null>(null)
const busy = ref(false)
const good = ref<number[]>([])
const bad = ref<number[]>([])
const area = ref({ w: 360, h: 480 })
const wrap = ref<HTMLElement | null>(null)
let ro: ResizeObserver | undefined
let timer: number | undefined

/** 布局：卡片尽量大但不溢出；圆点尺寸由视角决定，放不下时缩小 */
const layout = computed(() => {
  const n = trial.value.cards.length
  const dot0 = props.ctx.arcminToPx(cellArcmin(props.level))
  const want = Math.max(MIN_CARD, dot0 * 3 + dot0 * 0.7 * 2 + 28)
  const W = Math.max(1, area.value.w - 2 * PAD), H = Math.max(1, area.value.h - 2 * PAD)
  let best = { cols: n, fit: 0 }
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    const fit = Math.min((W - (cols - 1) * CARD_GAP) / cols, (H - (rows - 1) * CARD_GAP) / rows)
    if (fit > best.fit) best = { cols, fit }
  }
  const card = Math.max(40, Math.min(want, best.fit, 200))
  // 卡片缩小时按比例缩小圆点（内边距至少 10px）
  const dot = Math.min(dot0, (card - 20) / (3 + 0.7 * 2))
  return { cols: best.cols, card, dot, gap: dot * 0.7 }
})

function next() {
  trial.value = makeTrial(props.level, rng)
  picked.value = null
  good.value = []
  bad.value = []
  busy.value = false
}

function tap(i: number) {
  if (busy.value) return
  if (picked.value === null) { picked.value = i; return }
  if (picked.value === i) { picked.value = null; return }
  const first = picked.value
  const ok = isCorrect(trial.value, first, i)
  busy.value = true
  if (ok) good.value = [first, i]
  else bad.value = [first, i]
  emit('trial', ok)
  timer = window.setTimeout(next, FEEDBACK_MS)
}

function measure() {
  const el = wrap.value
  if (!el) return
  const r = el.getBoundingClientRect()
  if (r.width > 0 && r.height > 0) area.value = { w: r.width, h: r.height }
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && wrap.value) {
    ro = new ResizeObserver(measure)
    ro.observe(wrap.value)
  }
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  ro?.disconnect()
})

const stars = Array.from({ length: 8 }, (_, i) => i)
</script>

<template>
  <div ref="wrap" class="game">
    <div
      class="grid"
      :style="{ gridTemplateColumns: `repeat(${layout.cols}, ${layout.card}px)`, gap: `${CARD_GAP}px` }"
    >
      <div
        v-for="(card, i) in trial.cards"
        :key="i"
        role="button"
        class="card"
        :class="{ picked: picked === i, good: good.includes(i), bad: bad.includes(i) }"
        :style="{ width: `${layout.card}px`, height: `${layout.card}px` }"
        @pointerdown.prevent="tap(i)"
      >
        <div
          class="dots"
          :style="{ gridTemplateColumns: `repeat(3, ${layout.dot}px)`, gap: `${layout.gap}px` }"
        >
          <span
            v-for="(on, k) in card"
            :key="k"
            class="dot"
            :class="{ on }"
            :style="{ width: `${layout.dot}px`, height: `${layout.dot}px` }"
          />
        </div>
        <span v-if="good.includes(i)" class="burst" aria-hidden="true">
          <span v-for="s in stars" :key="s" class="spark" :style="{ '--a': `${s * 45}deg` }">★</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game {
  flex: 1; min-height: 0; position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.grid { display: grid; justify-content: center; align-content: center; }
.card {
  position: relative; display: flex; align-items: center; justify-content: center;
  background: var(--surface); border: 4px solid var(--line); border-radius: 18px;
  cursor: pointer; touch-action: none; transition: border-color 0.15s, transform 0.15s;
}
.card.picked { border-color: var(--accent); transform: translateY(-4px); }
.card.good { border-color: var(--primary); }
.card.bad { animation: shake 340ms ease-in-out; }
.dots { display: grid; }
.dot { display: block; border-radius: 50%; background: #e6dfcf; }
.dot.on { background: #3d3a35; }
.burst { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; }
.spark {
  position: absolute; left: -9px; top: -11px; font-size: 18px; color: #f2b632;
  animation: fly 450ms ease-out forwards;
}
@keyframes fly {
  from { transform: rotate(var(--a)) translateY(-10px) scale(1.2); opacity: 1; }
  to { transform: rotate(var(--a)) translateY(-70px) scale(0.6); opacity: 0; }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(7px); }
  75% { transform: translateX(-7px); }
}
</style>
