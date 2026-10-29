<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { store } from '../../core/store'
import { todayKey } from '../../core/date'
import { glassesStreak } from '../../core/rewards'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth()) // 0-11
const todayStr = todayKey()
const streak = computed(() => glassesStreak(store.days, todayStr))

const cells = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const lead = (first.getDay() + 6) % 7 // 周一开头
  const days = new Date(year.value, month.value + 1, 0).getDate()
  const out: ({ day: number; key: string; on: boolean } | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) {
    const key = todayKey(new Date(year.value, month.value, d))
    out.push({ day: d, key, on: !!store.days[key]?.glassesOn })
  }
  return out
})
const monthCount = computed(() => cells.value.filter(c => c?.on).length)

function shift(delta: number) {
  const d = new Date(year.value, month.value + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth()
}
const WEEK = ['一', '二', '三', '四', '五', '六', '日']
</script>

<template>
  <div class="page">
    <PageHeader title="戴镜打卡" back="/parent" back-label="‹" />
    <p class="streak">已连续戴镜 <b>{{ streak }}</b> 天 · 本月打卡 {{ monthCount }} 天</p>
    <div class="card">
      <div class="nav">
        <button type="button" aria-label="上个月" @click="shift(-1)">‹</button>
        <span>{{ year }} 年 {{ month + 1 }} 月</span>
        <button type="button" aria-label="下个月" @click="shift(1)">›</button>
      </div>
      <div class="grid">
        <div v-for="w in WEEK" :key="w" class="head">{{ w }}</div>
        <div v-for="(c, i) in cells" :key="i" class="cell" :class="{ today: c?.key === todayStr, on: c?.on }">
          <template v-if="c">
            <span class="num">{{ c.day }}</span>
            <span v-if="c.on" class="mark">👓</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.streak { font-size: 18px; text-align: center; }
.streak b { font-size: 28px; color: var(--primary-dark); }
.nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 20px; font-weight: 700; }
.nav button {
  width: 56px; height: 56px; border: none; border-radius: 16px; background: var(--surface-2);
  font-size: 28px; color: var(--text); cursor: pointer;
}
.grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.head { text-align: center; color: var(--muted); font-size: 14px; }
.cell {
  aspect-ratio: 1; border-radius: 12px; display: flex; flex-direction: column; align-items: center;
  justify-content: center; background: var(--bg); font-size: 14px; min-width: 0;
}
.cell:empty { background: transparent; }
.cell.on { background: #d7ece9; }
.cell.today { outline: 2px solid var(--accent); }
.mark { font-size: clamp(14px, 4vw, 24px); line-height: 1; }
</style>
