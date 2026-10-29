<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { GameContext } from '../types'
import { createRng } from '../../core/random'
import { hatArcmin, holeCount, judge, makePop, upMs, type Pop } from './logic'
import { BURST_MS, SHAKE_MS, clamp, useStageSize, useTimers } from '../_kit/canvas'
import DomBurst from '../_kit/DomBurst.vue'

const props = defineProps<{ level: number; ctx: GameContext }>()
const emit = defineEmits<{ trial: [correct: boolean] }>()

const rng = createRng(Date.now())
const timers = useTimers()
const root = ref<HTMLElement | null>(null)
const size = useStageSize(root)

const holes = ref(holeCount(props.level))
const pop = ref<Pop | null>(null)
const up = ref(false)
const hatPx = ref(10)
const shaking = ref(-1)
const hammer = ref(-1)
const bursts = ref<{ id: number; x: number; y: number }[]>([])
let burstId = 0
let judged = false
let upTimer: number | undefined

const rows = computed(() => {
  const top = Math.ceil(holes.value / 2)
  return [Array.from({ length: top }, (_, i) => i), Array.from({ length: holes.value - top }, (_, i) => top + i)]
})
/** 洞的宽度：两排放得下，且触控区域不小于 64px */
const holeW = computed(() => {
  const perRow = Math.ceil(holes.value / 2)
  const w = size.w || 320, h = size.h || 320
  return clamp(Math.min((w * 0.9) / perRow, (h * 0.85) / 2 / 1.05), 64, 190)
})
const moleW = computed(() => holeW.value * 0.62)

function nextPop() {
  pop.value = null
  up.value = false
  timers.later(() => {
    // 在这里读取等级：此时父组件已把新的 level 传进来
    holes.value = holeCount(props.level)
    pop.value = makePop(props.level, rng)
    hatPx.value = clamp(props.ctx.arcminToPx(hatArcmin(props.level)), 4, moleW.value * 0.25)
    judged = false
    up.value = true
    upTimer = timers.later(onTimeout, upMs(props.level))
  }, 500 + rng() * 600)
}

function goDown(delay: number) {
  timers.later(() => { up.value = false; timers.later(nextPop, 250) }, delay)
}

function onTimeout() {
  if (!pop.value || judged) return
  judged = true
  const r = judge(pop.value, 'timeout')
  if (r === false) {
    shaking.value = pop.value.hole
    timers.later(() => (shaking.value = -1), SHAKE_MS)
    emit('trial', false)
    goDown(SHAKE_MS)
  } else goDown(0)                       // 没戴帽子的地鼠自己回去，不计入判定
}

function onTap(i: number, e: PointerEvent) {
  const p = pop.value
  if (!p || !up.value || judged || p.hole !== i) return   // 空洞不判定
  judged = true
  timers.cancel(upTimer)
  hammer.value = i
  timers.later(() => (hammer.value = -1), 400)
  const r = judge(p, 'tap')
  if (r) {
    const box = root.value?.getBoundingClientRect()
    const el = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const id = ++burstId
    bursts.value.push({ id, x: el.left + el.width / 2 - (box?.left ?? 0), y: el.top + el.height * 0.4 - (box?.top ?? 0) })
    timers.later(() => (bursts.value = bursts.value.filter(b => b.id !== id)), BURST_MS)
    emit('trial', true)
    goDown(250)
  } else {
    shaking.value = i
    timers.later(() => (shaking.value = -1), SHAKE_MS)
    emit('trial', false)
    goDown(SHAKE_MS)
  }
}

onMounted(nextPop)
</script>

<template>
  <div ref="root" class="game">
    <div v-for="(row, r) in rows" :key="r" class="row">
      <div
        v-for="i in row"
        :key="i"
        class="hole"
        :class="{ shake: shaking === i }"
        :style="{ width: `${holeW}px`, height: `${holeW * 1.05}px` }"
        @pointerdown.prevent="onTap(i, $event)"
      >
        <div class="pit" />
        <div class="clip">
          <div class="mole" :class="{ up: up && pop?.hole === i }" :style="{ width: `${moleW}px`, height: `${moleW * 1.1}px` }">
            <div
              v-if="pop?.hole === i && pop.hasHat"
              class="hat"
              :style="{ height: `${hatPx}px`, width: `${hatPx * 1.4}px` }"
            />
            <span class="eye l" /><span class="eye r" /><span class="nose" />
          </div>
        </div>
        <div class="front" />
        <span v-if="hammer === i" class="hammer">🔨</span>
      </div>
    </div>
    <DomBurst v-for="b in bursts" :key="b.id" :x="b.x" :y="b.y" />
  </div>
</template>

<style scoped>
.game {
  flex: 1; min-height: 0; position: relative; overflow: hidden; touch-action: none;
  display: flex; flex-direction: column; justify-content: space-evenly; background: #dfe9cf;
}
.row { display: flex; justify-content: space-evenly; align-items: flex-end; }
.hole { position: relative; cursor: pointer; }
.pit {
  position: absolute; left: 4%; right: 4%; bottom: 4%; height: 30%;
  border-radius: 50%; background: #5d4a3a;
}
/* 地鼠从洞口冒出：clip 的底边在洞口中线 */
.clip { position: absolute; left: 0; right: 0; top: 0; bottom: 19%; overflow: hidden; }
.mole {
  position: absolute; left: 50%; bottom: 0; transform: translate(-50%, 140%);
  transition: transform 0.25s ease-out;
  background: #b98a5e; border-radius: 48% 48% 30% 30%;
}
.mole.up { transform: translate(-50%, 0); }
.hat {
  position: absolute; left: 50%; bottom: 100%; transform: translate(-50%, 2px);
  background: #3d6fb6; border-radius: 40% 40% 6% 6%;
}
.eye { position: absolute; top: 28%; width: 12%; height: 11%; border-radius: 50%; background: #3d3a35; }
.eye.l { left: 26%; } .eye.r { right: 26%; }
.nose { position: absolute; top: 44%; left: 50%; width: 16%; height: 11%; transform: translateX(-50%); border-radius: 50%; background: #e8a3a0; }
.front {
  position: absolute; left: 4%; right: 4%; bottom: 4%; height: 15%;
  border-radius: 0 0 50% 50% / 0 0 100% 100%; background: #7a6249;
}
.hammer {
  position: absolute; right: -6%; top: -4%; font-size: 48px; transform-origin: 80% 80%;
  animation: whack 0.35s ease-out both; pointer-events: none;
}
.shake { animation: nudge 0.3s ease-in-out; }
@keyframes whack { from { transform: rotate(-50deg); } to { transform: rotate(10deg); } }
@keyframes nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(8px); } }
</style>
