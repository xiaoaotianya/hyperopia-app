<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import { store, today } from '../core/store'
import { todayKey } from '../core/date'
import { pickDailyPlan } from '../core/dailyPlan'
import { isLocked, remainingSec } from '../core/sessionTimer'
import { speak } from '../core/speech'
import { GAMES, getGame } from '../games/registry'
import type { GameDefinition } from '../games/types'

const router = useRouter()
const day = today()

if (GAMES.length > 0 && day.plan.length === 0) {
  const history = Object.fromEntries(Object.entries(store.days).map(([k, v]) => [k, v.gamesPlayed]))
  day.plan = pickDailyPlan(GAMES.map(g => ({ id: g.id, category: g.category })), history, todayKey(), 5)
}

const planGames = computed(() => day.plan.map(getGame).filter((g): g is GameDefinition => !!g))
const isDone = (id: string) => day.gamesPlayed.includes(id)
const remainingMin = computed(() => Math.ceil(remainingSec(day.secondsTrained, store.settings.dailyLimitMin) / 60))

onMounted(() => {
  const locked = isLocked(day.secondsTrained, store.settings.dailyLimitMin)
  const allDone = planGames.value.length > 0 && planGames.value.every(g => isDone(g.id))
  if (locked || allDone) { router.replace('/done'); return }
  if (planGames.value.length > 0) speak('选一个游戏吧')
})

function play(g: GameDefinition) {
  if (!isDone(g.id)) router.push(`/play/${g.id}`)
}
</script>

<template>
  <div class="page">
    <PageHeader title="今天的游戏" />

    <div v-if="planGames.length === 0" class="empty card">
      <div class="big">🧸</div>
      <p>游戏正在准备中</p>
    </div>

    <ul v-else class="list">
      <li v-for="g in planGames" :key="g.id">
        <button type="button" class="game" :class="{ done: isDone(g.id) }" @click="play(g)">
          <span class="icon">{{ g.icon }}</span>
          <span class="name">{{ g.name }}</span>
          <span class="state">{{ isDone(g.id) ? '✅' : '▶' }}</span>
        </button>
      </li>
    </ul>

    <p class="remain">⏳ 今天还可以玩 {{ remainingMin }} 分钟</p>
  </div>
</template>

<style scoped>
.list {
  list-style: none; margin: 0; padding: 0; display: grid; gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
}
.game {
  width: 100%; min-height: 96px; display: flex; align-items: center; gap: 16px; padding: 12px 20px;
  border: none; border-radius: var(--radius); background: var(--surface); color: var(--text);
  font: inherit; cursor: pointer; box-shadow: 0 6px 0 var(--surface-2); text-align: left;
}
.game.done { opacity: 0.6; cursor: default; box-shadow: none; }
.icon { font-size: 56px; }
.name { flex: 1; font-size: 24px; font-weight: 700; }
.state { font-size: 32px; color: var(--primary-dark); }
.empty { text-align: center; font-size: 26px; font-weight: 700; }
.big { font-size: 96px; }
.remain { text-align: center; font-size: 22px; color: var(--muted); margin-top: 24px; }
</style>
