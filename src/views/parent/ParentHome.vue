<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ParentGate from '../../components/ParentGate.vue'
import PageHeader from '../../components/PageHeader.vue'
import WearPicker from '../../components/WearPicker.vue'
import AlertList from '../../components/AlertList.vue'
import { storage, store } from '../../core/store'
import { addDays, daysBetween, todayKey } from '../../core/date'
import { speechAvailable } from '../../core/speech'
import { isParentOk } from '../../core/parentAuth'
import { computeAlerts, nextRecheckDate } from '../../core/alerts'
import { goodStreak, weekGoodCount, WEAR_LABELS } from '../../core/wear'
import { logmarToDecimal } from '../../core/ageNorms'

const route = useRoute()
const router = useRouter()
const ok = ref(isParentOk())

function onPass() {
  ok.value = true
  const next = typeof route.query.next === 'string' ? route.query.next : ''
  if (next.startsWith('/parent/')) router.replace(next)
}

const todayStr = todayKey()
const todayWear = computed(() => store.days[todayStr]?.wear)
const alerts = computed(() => computeAlerts(store, todayStr, { persistent: storage.persistent, speech: speechAvailable() }))

const streak = computed(() => goodStreak(store.days, todayStr))
const weekGood = computed(() => weekGoodCount(store.days, todayStr))

const lastTest = computed(() =>
  store.acuityTests.filter(t => t.date <= todayStr).reduce<(typeof store.acuityTests)[number] | null>(
    (a, t) => (!a || t.date >= a.date ? t : a), null))
const eye = (l: number | null) => (l === null ? '<0.1' : String(logmarToDecimal(l)))

const recheck = computed(() => {
  const d = nextRecheckDate(store, todayStr)
  if (!d) return null
  const n = daysBetween(todayStr, d)
  return { date: d, hint: n > 0 ? `还有 ${n} 天` : n === 0 ? '就是今天' : `已过 ${-n} 天`, overdue: n < 0 }
})

const weekMinutes = computed(() => {
  let s = 0
  for (let i = 0; i < 7; i++) s += store.days[addDays(todayStr, -i)]?.secondsTrained ?? 0
  return Math.round(s / 60)
})

const menu = [
  { to: '/parent/checkin', icon: '📅', label: '戴镜打卡' },
  { to: '/parent/acuity', icon: '👁️', label: '视力自测' },
  { to: '/parent/observe', icon: '📝', label: '观察记录' },
  { to: '/parent/visits', icon: '🏥', label: '复查档案' },
  { to: '/parent/report', icon: '📋', label: '医生报告' },
  { to: '/parent/progress', icon: '📈', label: '训练进度' },
  { to: '/parent/settings', icon: '⚙️', label: '设置' },
  { to: '/parent/calibration', icon: '💳', label: '屏幕校准' },
  { to: '/parent/disclaimer', icon: '📄', label: '使用声明' },
]
</script>

<template>
  <div class="page">
    <PageHeader title="家长区" />
    <ParentGate v-if="!ok" @pass="onPass" />
    <template v-else>
      <section class="card wear">
        <h2>今天戴镜情况 <span v-if="todayWear" class="done">已记录：{{ WEAR_LABELS[todayWear] }}</span></h2>
        <WearPicker :date="todayStr" />
      </section>

      <AlertList :alerts="alerts" class="alerts" />

      <section class="overview" aria-label="概览">
        <div class="stat card">
          <div class="label">连续戴镜达标</div>
          <div class="value"><b>{{ streak }}</b> 天</div>
          <div class="sub">近 7 天达标 {{ weekGood }}/7 天</div>
        </div>
        <button type="button" class="stat card link" @click="router.push('/parent/acuity')">
          <div class="label">最近一次视力自测</div>
          <template v-if="lastTest">
            <div class="value eyes">右眼 <b>{{ eye(lastTest.od.logmar) }}</b> · 左眼 <b>{{ eye(lastTest.os.logmar) }}</b></div>
            <div class="sub">{{ lastTest.date }}</div>
          </template>
          <div v-else class="value none">还没有测过</div>
        </button>
        <button type="button" class="stat card link" @click="router.push('/parent/visits')">
          <div class="label">下次复查</div>
          <template v-if="recheck">
            <div class="value date" :class="{ overdue: recheck.overdue }">{{ recheck.date }}</div>
            <div class="sub">{{ recheck.hint }}</div>
          </template>
          <div v-else class="value none">未设置</div>
        </button>
        <div class="stat card">
          <div class="label">近 7 天训练</div>
          <div class="value"><b>{{ weekMinutes }}</b> 分钟</div>
        </div>
      </section>

      <nav class="menu" aria-label="家长区菜单">
        <button v-for="m in menu" :key="m.to" type="button" class="item" @click="router.push(m.to)">
          <span class="icon">{{ m.icon }}</span>
          <span>{{ m.label }}</span>
        </button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
h2 { margin: 0 0 12px; font-size: 18px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
.done { font-size: 14px; font-weight: 400; color: var(--muted); }
.wear, .alerts, .overview { margin-bottom: 16px; }
.overview { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr)); }
@media (max-width: 520px) { .overview { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.stat { display: flex; flex-direction: column; gap: 4px; min-width: 0; padding: 14px 16px; border: none; text-align: left; font: inherit; color: var(--text); }
.stat.link { cursor: pointer; }
.label { font-size: 14px; color: var(--muted); }
.value { font-size: 16px; }
.value b { font-size: 28px; color: var(--primary-dark); }
.value.eyes b { font-size: 22px; }
.value.date { font-size: 20px; font-weight: 700; }
.value.overdue { color: #b0502f; }
.value.none { font-size: 16px; color: var(--muted); }
.sub { font-size: 13px; color: var(--muted); }
.menu { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); }
@media (max-width: 520px) { .menu { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.item {
  min-height: 64px; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  border: none; border-radius: 16px; background: var(--surface); color: var(--text);
  font: inherit; font-size: 18px; cursor: pointer; text-align: left;
}
.icon { font-size: 26px; }
</style>
