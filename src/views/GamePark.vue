<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import { GAMES } from '../games/registry'
import { CATEGORY_ICONS, CATEGORY_NAMES, type GameDefinition } from '../games/types'
import type { Category } from '../core/dailyPlan'

const router = useRouter()
const order: Category[] = ['fine', 'contrast', 'eye-move', 'hand-eye']
const groups = computed(() =>
  order
    .map(c => ({ category: c, games: GAMES.filter(g => g.category === c) }))
    .filter(gr => gr.games.length > 0),
)
const play = (g: GameDefinition) => router.push(`/play/${g.id}`)
</script>

<template>
  <div class="page">
    <PageHeader title="游戏乐园" />

    <div v-if="groups.length === 0" class="empty card">
      <div class="big">🎡</div>
      <p>游戏正在准备中</p>
    </div>

    <section v-for="gr in groups" :key="gr.category" class="group">
      <h2>{{ CATEGORY_ICONS[gr.category] }} {{ CATEGORY_NAMES[gr.category] }}</h2>
      <div class="grid">
        <button v-for="g in gr.games" :key="g.id" type="button" class="tile" @click="play(g)">
          <span class="icon">{{ g.icon }}</span>
          <span class="name">{{ g.name }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.group { margin-bottom: 24px; }
h2 { font-size: 24px; margin: 0 0 12px; }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
.tile {
  min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  border: none; border-radius: var(--radius); background: var(--surface); color: var(--text);
  font: inherit; cursor: pointer; box-shadow: 0 6px 0 var(--surface-2);
}
.icon { font-size: 64px; }
.name { font-size: 20px; font-weight: 700; }
.empty { text-align: center; font-size: 26px; font-weight: 700; }
.big { font-size: 96px; }
</style>
