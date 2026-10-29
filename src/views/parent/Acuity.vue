<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import { store } from '../../core/store'
import { todayKey } from '../../core/date'
import { ageMonths, ageThresholdLogmar, logmarToDecimal } from '../../core/ageNorms'
import type { AcuityTest, AcuityTrial } from '../../core/storage'

const router = useRouter()

/** 按日期升序（同日按录入顺序） */
const sorted = computed(() =>
  store.acuityTests.map((t, i) => ({ t, i }))
    .sort((a, b) => (a.t.date < b.t.date ? -1 : a.t.date > b.t.date ? 1 : a.i - b.i))
    .map(x => x.t),
)
const newestFirst = computed(() => sorted.value.slice().reverse())

const fmtDec = (l: number | null) => {
  if (l === null) return '< 0.1'
  const d = logmarToDecimal(l)
  return d >= 1 ? d.toFixed(1) : String(d)
}
const fmtLog = (l: number | null) => (l === null ? '> 1.0' : l.toFixed(1))

// ---- 趋势图 ----
const W = 420, H = 230
const PAD = { l: 44, r: 14, t: 12, b: 30 }
const plotW = W - PAD.l - PAD.r
const plotH = H - PAD.t - PAD.b
/** logMAR 0 在顶部、1.0 在底部；劣于 1.0（null）画在底线上，用空心点标出 */
const yOf = (l: number | null) => PAD.t + (Math.min(l ?? 1, 1) / 1) * plotH
const TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
const GRID = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]

const points = computed(() => {
  const n = sorted.value.length
  return sorted.value.map((t, i) => ({
    t,
    x: PAD.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW),
  }))
})
const series = computed(() =>
  (['od', 'os'] as const).map(e => {
    const pts = points.value.map(p => ({ x: p.x, y: yOf(p.t[e].logmar), worse: p.t[e].logmar === null, id: p.t.id }))
    return { eye: e, pts, path: pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') }
  }),
)
/** 横轴标签：最多 6 个，均匀抽样，首尾必显示 */
const xLabels = computed(() => {
  const pts = points.value
  const pick = pts.length <= 6 ? pts : [0, 1, 2, 3, 4, 5].map(k => pts[Math.round((k / 5) * (pts.length - 1))])
  // 首尾标签向内对齐，避免被裁掉
  return pick.map((p, i) => ({
    x: p.x, text: p.t.date.slice(5),
    anchor: pick.length === 1 ? 'middle' : i === 0 ? 'start' : i === pick.length - 1 ? 'end' : 'middle',
  }))
})
const ageLine = computed(() => {
  const th = ageThresholdLogmar(ageMonths(store.profile.birthMonth, todayKey()))
  return th === null ? null : { y: yOf(th), text: fmtDec(th) }
})
const anyWorse = computed(() => sorted.value.some(t => t.od.logmar === null || t.os.logmar === null))

// ---- 历史列表 ----
const open = reactive<Record<string, boolean>>({})
const FLAG_TEXT: Record<AcuityTest['flags'][number], string> = {
  'below-age': '低于同龄参考',
  interocular: '两眼差 ≥ 2 档',
  decline: '比上次下降',
}
interface LevelRow { logmar: number; marks: string; passed: boolean }
function levelRows(trials: AcuityTrial[]): LevelRow[] {
  const rows: LevelRow[] = []
  let cur: { logmar: number; list: AcuityTrial[] } | null = null
  const flush = () => {
    if (!cur) return
    const ok = cur.list.filter(t => t.correct).length
    rows.push({ logmar: cur.logmar, marks: cur.list.map(t => (t.correct ? '✓' : t.answer === 'unseen' ? '?' : '✗')).join(' '), passed: ok >= 2 })
  }
  for (const tr of trials) {
    if (!cur || Math.round(cur.logmar * 10) !== Math.round(tr.logmar * 10)) { flush(); cur = { logmar: tr.logmar, list: [] } }
    cur.list.push(tr)
  }
  flush()
  return rows
}
function remove(t: AcuityTest) {
  if (!window.confirm(`删除 ${t.date} 的自测记录？删除后无法恢复。`)) return
  const i = store.acuityTests.findIndex(x => x.id === t.id)
  if (i >= 0) store.acuityTests.splice(i, 1)
}
</script>

<template>
  <div class="page">
    <PageHeader title="视力自测" back="/parent" back-label="‹" />

    <section class="card start">
      <p class="muted">左右眼分别测近视力（40 厘米），约 3–5 分钟，家长陪同完成。</p>
      <button type="button" class="btn primary" @click="router.push('/parent/acuity/test')">开始自测</button>
    </section>

    <section class="card">
      <h2>视力趋势</h2>
      <p v-if="sorted.length === 0" class="muted">还没有自测记录，测一次后这里会显示趋势。</p>
      <template v-else>
        <div class="legend">
          <span class="key od"><i /> 右眼 OD</span>
          <span class="key os"><i /> 左眼 OS</span>
          <span v-if="ageLine" class="key age"><i /> 同龄参考 {{ ageLine.text }}</span>
        </div>
        <svg :viewBox="`0 0 ${W} ${H}`" class="chart" role="img" aria-label="左右眼视力趋势图">
          <line v-for="g in GRID" :key="g" :x1="PAD.l" :x2="W - PAD.r" :y1="yOf(g)" :y2="yOf(g)" class="grid" />
          <text v-for="tk in TICKS" :key="`t${tk}`" :x="PAD.l - 8" :y="yOf(tk) + 4" class="ylab">{{ fmtDec(tk) }}</text>
          <line :x1="PAD.l" :x2="W - PAD.r" :y1="PAD.t + plotH" :y2="PAD.t + plotH" class="axis" />
          <line v-if="ageLine" :x1="PAD.l" :x2="W - PAD.r" :y1="ageLine.y" :y2="ageLine.y" class="age-line" />
          <g v-for="s in series" :key="s.eye" :class="s.eye">
            <polyline v-if="s.pts.length > 1" :points="s.path" class="line" />
            <template v-for="p in s.pts" :key="p.id">
              <circle v-if="s.eye === 'od'" :cx="p.x" :cy="p.y" r="5" class="dot" :class="{ worse: p.worse }" />
              <rect v-else :x="p.x - 4.5" :y="p.y - 4.5" width="9" height="9" class="dot" :class="{ worse: p.worse }" />
            </template>
          </g>
          <text v-for="(l, i) in xLabels" :key="`x${i}`" :x="l.x" :y="H - 10" class="xlab" :text-anchor="l.anchor">{{ l.text }}</text>
        </svg>
        <p class="muted note">
          纵轴为小数视力（按 logMAR 等距），越往上越好。<template v-if="anyWorse">空心点表示低于 0.1。</template>
        </p>
      </template>
    </section>

    <section v-if="sorted.length" class="card">
      <h2>历史记录</h2>
      <ul class="history">
        <li v-for="t in newestFirst" :key="t.id" class="item">
          <div class="head">
            <button type="button" class="toggle" :aria-expanded="!!open[t.id]" @click="open[t.id] = !open[t.id]">
              <span class="date">{{ t.date }}</span>
              <span class="va">右 {{ fmtDec(t.od.logmar) }} · 左 {{ fmtDec(t.os.logmar) }}</span>
              <span class="chev">{{ open[t.id] ? '▲' : '▼' }}</span>
            </button>
            <button type="button" class="del" aria-label="删除" @click="remove(t)">删除</button>
          </div>
          <div v-if="t.flags.length" class="tags">
            <span v-for="f in t.flags" :key="f" class="tag">{{ FLAG_TEXT[f] }}</span>
          </div>
          <div v-if="open[t.id]" class="detail">
            <div v-for="e in (['od', 'os'] as const)" :key="e" class="eye">
              <h3>{{ e === 'od' ? '右眼' : '左眼' }}：{{ fmtDec(t[e].logmar) }}（logMAR {{ fmtLog(t[e].logmar) }}）</h3>
              <table><tbody>
                <tr v-for="(r, i) in levelRows(t[e].trials)" :key="i">
                  <td>{{ fmtDec(r.logmar) }}</td>
                  <td class="marks">{{ r.marks }}</td>
                  <td :class="r.passed ? 'pass' : 'fail'">{{ r.passed ? '通过' : '未通过' }}</td>
                </tr>
              </tbody></table>
            </div>
            <p class="muted small">
              距离 {{ t.distanceMm / 10 }} 厘米 · 本设备最好可测 {{ fmtDec(t.bestMeasurableLogmar) }} · ✓ 答对 ✗ 答错 ? 看不清
            </p>
          </div>
        </li>
      </ul>
    </section>

    <p class="foot muted">
      家庭自测仅供参考，不能代替医院检查；参考线来自 AAPOS 儿童视力筛查转诊标准（针对远视力），仅作参考。
    </p>
  </div>
</template>

<style scoped>
.card { margin-bottom: 16px; }
h2 { font-size: 18px; margin: 0 0 8px; }
h3 { font-size: 15px; margin: 0 0 4px; }
.start { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.start p { margin: 0; flex: 1 1 220px; font-size: 15px; }
.btn {
  min-height: 64px; padding: 0 32px; border: none; border-radius: 18px; font: inherit;
  font-size: 20px; font-weight: 700; cursor: pointer;
}
.btn.primary { background: var(--primary); color: var(--on-primary); }

.legend { display: flex; flex-wrap: wrap; gap: 16px; font-size: 14px; margin-bottom: 4px; }
.key { display: inline-flex; align-items: center; gap: 6px; }
.key i { display: inline-block; width: 22px; height: 0; border-top: 3px solid; }
.key.od i { border-color: var(--od); }
.key.os i { border-color: var(--os); }
.key.age i { border-top: 2px dashed var(--muted); }
.chart { width: 100%; max-width: 720px; height: auto; display: block; margin: 0 auto; }
.page { --od: #2f6f9f; --os: #c2621b; }
.grid { stroke: var(--line); stroke-width: 1; opacity: 0.6; }
.axis { stroke: var(--muted); stroke-width: 1.5; }
.age-line { stroke: var(--muted); stroke-width: 2; stroke-dasharray: 8 6; }
.ylab { font-size: 14px; fill: var(--muted); text-anchor: end; }
.xlab { font-size: 13px; fill: var(--muted); }
.line { fill: none; stroke-width: 2.5; stroke-linejoin: round; }
.od .line { stroke: var(--od); }
.os .line { stroke: var(--os); }
.od .dot { fill: var(--od); }
.os .dot { fill: var(--os); }
.dot.worse { fill: var(--surface); stroke-width: 2.5; }
.od .dot.worse { stroke: var(--od); }
.os .dot.worse { stroke: var(--os); }
.note { margin: 6px 0 0; font-size: 13px; }

.history { list-style: none; margin: 0; padding: 0; }
.item { border-top: 1px solid var(--line); padding: 8px 0; }
.item:first-child { border-top: none; }
.head { display: flex; align-items: center; gap: 8px; }
.toggle {
  flex: 1; min-width: 0; min-height: 52px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  border: none; background: none; padding: 4px 0; font: inherit; color: var(--text); text-align: left; cursor: pointer;
}
.date { font-weight: 700; font-size: 16px; }
.va { font-size: 16px; }
.chev { margin-left: auto; color: var(--muted); font-size: 12px; }
.del {
  min-height: 44px; padding: 0 14px; border: 1px solid var(--line); border-radius: 12px;
  background: var(--surface); color: #a3462c; font: inherit; font-size: 14px; cursor: pointer;
}
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 4px; }
.tag { font-size: 12px; padding: 2px 8px; border-radius: 999px; background: #f6dfc4; color: #7a4512; }
.detail { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; padding: 6px 0 2px; }
.detail .small { grid-column: 1 / -1; margin: 0; }
.small { font-size: 13px; }
table { border-collapse: collapse; font-size: 14px; }
td { padding: 2px 10px 2px 0; }
.marks { letter-spacing: 1px; }
.pass { color: #2f7d4f; }
.fail { color: #a3462c; }
.foot { font-size: 13px; line-height: 1.6; margin: 8px 0 24px; }
</style>
