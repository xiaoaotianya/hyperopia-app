<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { store } from '../../core/store'
import { todayKey } from '../../core/date'
import { GAMES } from '../../games/registry'

// ---- 近 14 天训练时长柱状图 ----
const W = 640
const H = 220
const PAD = { l: 36, r: 8, t: 16, b: 28 }
const plotW = W - PAD.l - PAD.r
const plotH = H - PAD.t - PAD.b

const days = computed(() => {
  const out: { key: string; label: string; min: number }[] = []
  const base = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i)
    const key = todayKey(d)
    out.push({ key, label: String(d.getDate()), min: (store.days[key]?.secondsTrained ?? 0) / 60 })
  }
  return out
})
const barMax = computed(() => Math.max(store.settings.dailyLimitMin, ...days.value.map(d => d.min), 1))
const bars = computed(() => {
  const slot = plotW / days.value.length
  return days.value.map((d, i) => {
    const h = (d.min / barMax.value) * plotH
    return { ...d, x: PAD.l + i * slot + slot * 0.15, w: slot * 0.7, y: PAD.t + plotH - h, h, cx: PAD.l + i * slot + slot / 2 }
  })
})
const limitY = computed(() => PAD.t + plotH - (store.settings.dailyLimitMin / barMax.value) * plotH)

// ---- 每个游戏的水平折线 ----
const LW = 640
const LH = 200
const LP = { l: 48, r: 12, t: 16, b: 24 }

const lines = computed(() =>
  GAMES.map(g => {
    const hist = (store.games[g.id]?.history ?? []).slice(-30)
    const values = hist.map(h => g.primaryMetric.fromLevel(h.levelEnd))
    const lo0 = Math.min(...values)
    const hi0 = Math.max(...values)
    const pad = hi0 === lo0 ? Math.max(Math.abs(hi0) * 0.1, 1) : (hi0 - lo0) * 0.1
    const lo = lo0 - pad
    const hi = hi0 + pad
    const pw = LW - LP.l - LP.r
    const ph = LH - LP.t - LP.b
    const pts = values.map((v, i) => ({
      x: LP.l + (values.length === 1 ? pw / 2 : (i / (values.length - 1)) * pw),
      y: LP.t + ph - ((v - lo) / (hi - lo)) * ph,
      v,
      date: hist[i].date,
    }))
    const decreasing = g.primaryMetric.fromLevel(g.levels) < g.primaryMetric.fromLevel(0)
    return {
      game: g,
      pts,
      path: pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      hi: +hi0.toFixed(2),
      lo: +lo0.toFixed(2),
      hint: decreasing ? '数值越小越好' : '数值越大越好',
      last: pts.length ? pts[pts.length - 1] : null,
    }
  }),
)
const fmt = (v: number) => +v.toFixed(2)
</script>

<template>
  <div class="page">
    <PageHeader title="训练进度" back="/parent" back-label="‹" />

    <section class="card">
      <h2>近 14 天训练时长（分钟）</h2>
      <svg :viewBox="`0 0 ${W} ${H}`" class="chart" role="img" aria-label="近14天训练时长柱状图">
        <line :x1="PAD.l" :x2="W - PAD.r" :y1="PAD.t + plotH" :y2="PAD.t + plotH" class="axis" />
        <line :x1="PAD.l" :x2="W - PAD.r" :y1="limitY" :y2="limitY" class="limit" />
        <text :x="PAD.l - 6" :y="limitY + 4" class="ylab">{{ store.settings.dailyLimitMin }}</text>
        <text :x="PAD.l - 6" :y="PAD.t + plotH + 4" class="ylab">0</text>
        <g v-for="b in bars" :key="b.key">
          <rect :x="b.x" :y="b.y" :width="b.w" :height="Math.max(b.h, 0)" rx="4" class="bar" />
          <text v-if="b.min >= 0.5" :x="b.cx" :y="b.y - 4" class="val">{{ Math.round(b.min) }}</text>
          <text :x="b.cx" :y="H - 8" class="xlab">{{ b.label }}</text>
        </g>
      </svg>
      <p class="muted note">虚线为每日上限</p>
    </section>

    <section v-if="GAMES.length === 0" class="card">
      <p class="muted">游戏正在准备中，暂时没有游戏数据。</p>
    </section>

    <section v-for="l in lines" :key="l.game.id" class="card">
      <h2>{{ l.game.icon }} {{ l.game.name }} · {{ l.game.primaryMetric.label }}（{{ l.game.primaryMetric.unit }}）</h2>
      <p v-if="l.pts.length === 0" class="muted">还没有训练记录</p>
      <template v-else>
        <svg :viewBox="`0 0 ${LW} ${LH}`" class="chart" role="img" :aria-label="`${l.game.name}水平曲线`">
          <line :x1="LP.l" :x2="LW - LP.r" :y1="LH - LP.b" :y2="LH - LP.b" class="axis" />
          <text :x="LP.l - 6" :y="LP.t + 4" class="ylab">{{ l.hi }}</text>
          <text :x="LP.l - 6" :y="LH - LP.b" class="ylab">{{ l.lo }}</text>
          <polyline :points="l.path" class="line" />
          <circle v-for="(p, i) in l.pts" :key="i" :cx="p.x" :cy="p.y" r="4" class="dot" />
          <text :x="LP.l" :y="LH - 6" class="xlab start">{{ l.pts[0].date.slice(5) }}</text>
          <text v-if="l.pts.length > 1" :x="LW - LP.r" :y="LH - 6" class="xlab end">{{ l.pts[l.pts.length - 1].date.slice(5) }}</text>
        </svg>
        <p class="muted note">
          最近一次：{{ l.last ? fmt(l.last.v) : '-' }} {{ l.game.primaryMetric.unit }} · 共 {{ l.pts.length }} 轮 · {{ l.hint }}
        </p>
      </template>
    </section>
  </div>
</template>

<style scoped>
.card { margin-bottom: 16px; }
h2 { font-size: 18px; margin: 0 0 8px; }
.chart { width: 100%; height: auto; display: block; }
.axis { stroke: var(--line); stroke-width: 1.5; }
.limit { stroke: var(--accent); stroke-width: 1.5; stroke-dasharray: 6 4; }
.bar { fill: var(--primary); }
.val { font-size: 12px; fill: var(--text); text-anchor: middle; }
.xlab { font-size: 12px; fill: var(--muted); text-anchor: middle; }
.xlab.start { text-anchor: start; }
.xlab.end { text-anchor: end; }
.ylab { font-size: 12px; fill: var(--muted); text-anchor: end; }
.line { fill: none; stroke: var(--primary-dark); stroke-width: 2.5; stroke-linejoin: round; }
.dot { fill: var(--accent); }
.note { margin: 6px 0 0; font-size: 14px; }
</style>
