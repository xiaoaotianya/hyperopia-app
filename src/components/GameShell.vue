<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRaw } from 'vue'
import type { GameContext, GameDefinition } from '../games/types'
import { store, today } from '../core/store'
import { todayKey } from '../core/date'
import { createStaircase, stepStaircase, warmupLevel, type StaircaseState } from '../core/staircase'
import { arcminToPx, pxPerDegree } from '../core/calibration'
import { isLocked, needsBreak, remainingSec } from '../core/sessionTimer'
import { breakClock } from '../core/breakClock'
import { speak } from '../core/speech'
import { playCorrect, playReward, playWrong } from '../core/sound'
import { nextSticker } from '../core/rewards'
import BreakOverlay from './BreakOverlay.vue'
import StickerBurst from './StickerBurst.vue'

const props = defineProps<{ def: GameDefinition }>()
const emit = defineEmits<{ done: [] }>()

const INTRO_SEC = 3
// 组件定义本身不需要响应式
const gameComponent = toRaw(props.def.component)
type Phase = 'intro' | 'play' | 'break' | 'reward'

// 确保 store 里有这个游戏的记录
if (!store.games[props.def.id]) store.games[props.def.id] = { staircase: null, history: [] }
const record = () => store.games[props.def.id]
if (!record().staircase) record().staircase = createStaircase(props.def.levels, 0)
const saved = record().staircase!

const sc = ref<StaircaseState>({
  ...saved,
  maxLevel: props.def.levels,
  level: warmupLevel(Math.min(saved.level, props.def.levels)),
  streak: 0,
})

const phase = ref<Phase>('intro')
const introLeft = ref(INTRO_SEC)
const visible = ref(typeof document === 'undefined' ? true : !document.hidden)
const sessionSec = Math.min(props.def.durationSec, remainingSec(today().secondsTrained, store.settings.dailyLimitMin))
const elapsed = ref(0)
const trials = ref(0)
const correct = ref(0)
const sticker = ref('')
let timer: number | undefined
let finished = false

const ctx: GameContext = {
  arcminToPx: a => arcminToPx(a, store.settings.viewingDistanceMm, store.calibration.pxPerMm),
  pxPerDegree: () => pxPerDegree(store.settings.viewingDistanceMm, store.calibration.pxPerMm),
  speak,
  playCorrect,
  playWrong,
}

const progressPct = computed(() => (sessionSec > 0 ? Math.min(100, (elapsed.value / sessionSec) * 100) : 100))

function writeHistory() {
  if (trials.value === 0) return
  record().history.push({ date: todayKey(), levelEnd: sc.value.level, trials: trials.value, correct: correct.value })
}

function finish() {
  if (finished) return
  finished = true
  writeHistory()
  today().gamesPlayed.push(props.def.id)
  sticker.value = nextSticker(store.stickers)
  store.stickers.push(sticker.value)
  playReward()
  speak('太棒啦！得到一张贴纸')
  phase.value = 'reward'
}

function quit() {
  if (finished) return
  finished = true
  writeHistory()
  emit('done')
}

function onTrial(ok: boolean) {
  if (phase.value !== 'play' || !visible.value) return
  sc.value = stepStaircase(sc.value, ok)
  record().staircase = { ...sc.value }
  trials.value++
  if (ok) { correct.value++; playCorrect() } else playWrong()
}

function tick() {
  if (!visible.value) return
  if (phase.value === 'intro') {
    introLeft.value--
    if (introLeft.value <= 0) phase.value = 'play'
    return
  }
  if (phase.value !== 'play') return
  elapsed.value++
  const day = today()
  day.secondsTrained++
  breakClock.tick()
  if (elapsed.value >= sessionSec || isLocked(day.secondsTrained, store.settings.dailyLimitMin)) finish()
  else if (needsBreak(breakClock.get(), store.settings.breakEveryMin)) phase.value = 'break'
}

function onBreakClose() {
  breakClock.reset()
  if (phase.value === 'break') phase.value = 'play'
}

function onVisibility() { visible.value = !document.hidden }

onMounted(() => {
  if (sessionSec <= 0) { finished = true; emit('done'); return }
  speak(props.def.voiceIntro)
  timer = window.setInterval(tick, 1000)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisibility)
  if (!finished) { finished = true; writeHistory() }
})
</script>

<template>
  <div class="shell">
    <header class="bar">
      <button type="button" class="home" aria-label="回家" @click="quit">🏠</button>
      <div class="track" aria-label="剩余时间">
        <div class="rail" />
        <span class="train" :style="{ left: `calc(${progressPct}% - ${progressPct * 0.44}px)` }">🚂</span>
        <span class="flag">🏁</span>
      </div>
    </header>

    <main class="stage">
      <component
        :is="gameComponent"
        v-if="phase === 'play' && visible"
        :level="sc.level"
        :ctx="ctx"
        @trial="onTrial"
      />
      <div v-if="phase === 'intro'" class="intro" @click="speak(props.def.voiceIntro)">
        <div class="intro-icon">{{ props.def.icon }}</div>
        <div class="intro-name">{{ props.def.name }}</div>
        <div class="intro-count">{{ introLeft > 0 ? introLeft : '开始！' }}</div>
      </div>
      <div v-if="!visible" class="paused">⏸️</div>
    </main>

    <BreakOverlay v-if="phase === 'break'" @close="onBreakClose" />
    <StickerBurst v-if="phase === 'reward'" :sticker="sticker" @close="emit('done')" />
  </div>
</template>

<style scoped>
.shell { height: 100%; display: flex; flex-direction: column; }
.bar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; }
.home {
  flex: none; width: 64px; height: 64px; border: none; border-radius: var(--radius);
  background: var(--surface); font-size: 30px; cursor: pointer;
}
.track { position: relative; flex: 1; height: 56px; }
.rail {
  position: absolute; left: 0; right: 0; top: 40px; height: 6px; border-radius: 3px;
  background: repeating-linear-gradient(90deg, #b9ad98 0 14px, transparent 14px 22px);
}
.train { position: absolute; top: 4px; font-size: 36px; line-height: 1; transition: left 1s linear; transform: scaleX(-1); }
.flag { position: absolute; right: 0; top: 4px; font-size: 30px; opacity: 0.7; }
.stage { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.stage > :deep(*:first-child) { flex: 1; min-height: 0; }
.intro {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.intro-icon { font-size: 120px; animation: bob 2s ease-in-out infinite; }
.intro-name { font-size: 32px; font-weight: 700; }
.intro-count { font-size: 56px; font-weight: 700; color: var(--primary-dark); }
.paused { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 80px; }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
</style>
