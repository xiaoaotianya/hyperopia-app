<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import WearPicker from '../../components/WearPicker.vue'
import { store } from '../../core/store'
import { daysBetween, todayKey } from '../../core/date'
import { goodStreak, weekGoodCount, WEAR_LABELS } from '../../core/wear'
import type { WearLevel } from '../../core/storage'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth()) // 0-11
const todayStr = todayKey()
const streak = computed(() => goodStreak(store.days, todayStr))
const weekGood = computed(() => weekGoodCount(store.days, todayStr))

/** 只允许补录最近 7 天（含今天） */
const editable = (key: string) => { const n = daysBetween(key, todayStr); return n >= 0 && n < 7 }

const cells = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const lead = (first.getDay() + 6) % 7 // 周一开头
  const days = new Date(year.value, month.value + 1, 0).getDate()
  const out: ({ day: number; key: string; wear?: WearLevel; editable: boolean } | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) {
    const key = todayKey(new Date(year.value, month.value, d))
    out.push({ day: d, key, wear: store.days[key]?.wear, editable: editable(key) })
  }
  return out
})

function shift(delta: number) {
  const d = new Date(year.value, month.value + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth()
}
const WEEK = ['一', '二', '三', '四', '五', '六', '日']
const LEGEND: WearLevel[] = ['full', 'most', 'less', 'none']

const editing = ref<string | null>(null)
const editingLabel = computed(() => {
  if (!editing.value) return ''
  const n = daysBetween(editing.value, todayStr)
  const [, m, d] = editing.value.split('-').map(Number)
  return `${m} 月 ${d} 日${n === 0 ? '（今天）' : n === 1 ? '（昨天）' : ''}`
})
</script>

<template>
  <div class="page">
    <PageHeader title="戴镜打卡" back="/parent" back-label="‹" />
    <div class="summary">
      <div class="card stat">已连续戴镜达标 <b>{{ streak }}</b> 天</div>
      <div class="card stat">近 7 天达标 <b>{{ weekGood }}</b>/7 天</div>
    </div>
    <div class="card">
      <div class="nav">
        <button type="button" aria-label="上个月" @click="shift(-1)">‹</button>
        <span>{{ year }} 年 {{ month + 1 }} 月</span>
        <button type="button" aria-label="下个月" @click="shift(1)">›</button>
      </div>
      <div class="grid">
        <div v-for="w in WEEK" :key="w" class="head">{{ w }}</div>
        <template v-for="(c, i) in cells" :key="i">
          <div v-if="!c" class="cell blank" />
          <button
            v-else
            type="button"
            class="cell"
            :class="[c.wear ?? 'unset', { today: c.key === todayStr, editable: c.editable }]"
            :disabled="!c.editable"
            :aria-label="`${c.day} 日：${c.wear ? WEAR_LABELS[c.wear] : '未记录'}${c.editable ? '，点击修改' : ''}`"
            @click="editing = c.key"
          >{{ c.day }}</button>
        </template>
      </div>
      <ul class="legend">
        <li v-for="l in LEGEND" :key="l"><span class="dot" :class="l" />{{ WEAR_LABELS[l] }}</li>
        <li><span class="dot unset" />未记录</li>
      </ul>
      <p class="muted hint">最近 7 天可以点日期补录或修改。全天、大半天算达标。</p>
    </div>

    <div v-if="editing" class="sheet-mask" @click.self="editing = null">
      <div class="sheet card" role="dialog" aria-modal="true" :aria-label="`记录 ${editingLabel} 的戴镜情况`">
        <h2>{{ editingLabel }}戴镜情况</h2>
        <WearPicker :date="editing" @change="editing = null" />
        <button type="button" class="close" @click="editing = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat { font-size: 16px; text-align: center; padding: 12px; }
.stat b { font-size: 28px; color: var(--primary-dark); }
.nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 20px; font-weight: 700; }
.nav button {
  width: 56px; height: 56px; border: none; border-radius: 16px; background: var(--surface-2);
  font-size: 28px; color: var(--text); cursor: pointer;
}
.grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.head { text-align: center; color: var(--muted); font-size: 14px; }
.cell {
  aspect-ratio: 1; min-width: 0; padding: 0; border-radius: 12px; display: flex; align-items: center;
  justify-content: center; font: inherit; font-size: 15px; color: var(--text); border: 2px solid transparent;
}
.cell.blank { background: transparent; }
.cell.full { background: var(--wear-full); color: #fff; }
.cell.most { background: var(--wear-most); color: #24351a; }
.cell.less { background: var(--wear-less); color: #4a3410; }
.cell.none { background: var(--wear-none); color: #fff; }
.cell.unset { background: transparent; border-color: var(--line); color: var(--muted); }
.cell.editable { cursor: pointer; font-weight: 700; }
.cell.editable.unset { border-style: dashed; border-color: var(--primary); color: var(--text); }
.cell:disabled { cursor: default; opacity: 1; }
.cell.today { outline: 3px solid var(--accent); outline-offset: 1px; }
.legend { list-style: none; display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 16px 0 0; padding: 0; font-size: 14px; }
.legend li { display: flex; align-items: center; gap: 6px; }
.dot { width: 16px; height: 16px; border-radius: 5px; border: 2px solid transparent; }
.dot.full { background: var(--wear-full); }
.dot.most { background: var(--wear-most); }
.dot.less { background: var(--wear-less); }
.dot.none { background: var(--wear-none); }
.dot.unset { border-color: var(--line); }
.hint { margin: 10px 0 0; font-size: 14px; }
.sheet-mask {
  position: fixed; inset: 0; z-index: 40; background: rgba(61, 58, 53, 0.35);
  display: flex; align-items: flex-end; justify-content: center; padding: var(--gutter);
}
.sheet { width: 100%; max-width: 520px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15); }
.sheet h2 { margin: 0 0 12px; font-size: 18px; }
.close {
  width: 100%; min-height: 48px; margin-top: 12px; border: none; border-radius: 12px; background: var(--surface-2);
  color: var(--text); font: inherit; font-size: 17px; cursor: pointer;
}
</style>
