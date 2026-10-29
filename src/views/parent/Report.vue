<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { store } from '../../core/store'
import type { AcuityTest, WearLevel } from '../../core/storage'
import { todayKey } from '../../core/date'
import { ageMonths, logmarToDecimal } from '../../core/ageNorms'
import { CHECK_ITEMS } from '../../core/checklist'
import { WEAR_LABELS } from '../../core/wear'
import { nextRecheckDate } from '../../core/alerts'
import { EYE_POSITION_LABELS, fmtRx, sortVisitsDesc } from '../../core/visits'
import {
  RANGE_MONTHS, acuityInRange, fmtAge, observationSummary, rangeStart, trainingSummary, wearSummary,
} from '../../core/report'
import { GAMES } from '../../games/registry'
import { CATEGORY_ICONS, CATEGORY_NAMES } from '../../games/types'

const today = todayKey()
const months = ref<number>(3)
const start = computed(() => rangeStart(today, months.value))

const current = computed(() => sortVisitsDesc(store.visits.filter(v => v.date <= today))[0])
const nextDate = computed(() => nextRecheckDate(store, today))
const age = computed(() => fmtAge(ageMonths(store.profile.birthMonth, today)))
const birth = computed(() => {
  const m = /^(\d{4})-(\d{2})$/.exec(store.profile.birthMonth ?? '')
  return m ? `${m[1]} 年 ${+m[2]} 月` : '未填写'
})

const wear = computed(() => wearSummary(store.days, start.value, today))
const LEVELS: WearLevel[] = ['full', 'most', 'less', 'none']

const acuity = computed(() => acuityInRange(store.acuityTests, start.value, today))
const fmtEye = (l: number | null) => (l === null ? '低于 0.1' : `${logmarToDecimal(l)}（logMAR ${l.toFixed(1)}）`)
const FLAG_LABELS: Record<AcuityTest['flags'][number], string> = {
  'below-age': '低于年龄参考', interocular: '两眼相差 2 行及以上', decline: '较上次下降 2 行及以上',
}
const flagText = (t: AcuityTest) => t.flags.map(f => FLAG_LABELS[f]).join('、') || '—'

const obs = computed(() => observationSummary(store.checklists, store.observations, start.value, today))
const itemText = (id: string) => CHECK_ITEMS.find(i => i.id === id)?.text.replace(/[？?]$/, '') ?? id
const shortDate = (d: string) => d.slice(5)

const training = computed(() => trainingSummary(GAMES, store.games, store.days, start.value, today))

const printTip = ref(false)
function doPrint() {
  if (typeof window === 'undefined' || typeof window.print !== 'function') { printTip.value = true; return }
  try { window.print() } catch { printTip.value = true }
}
</script>

<template>
  <div class="page report-page">
    <div class="no-print">
      <PageHeader title="给医生的报告" back="/parent" back-label="‹" />
      <div class="card controls">
        <div class="range" role="radiogroup" aria-label="统计范围">
          <span>统计范围</span>
          <button
            v-for="m in RANGE_MONTHS" :key="m" type="button" role="radio" :aria-checked="months === m"
            :class="{ sel: months === m }" @click="months = m"
          >近 {{ m }} 个月</button>
        </div>
        <button type="button" class="btn primary" @click="doPrint">🖨️ 打印 / 保存为 PDF</button>
        <p v-if="printTip" class="tip strong" role="alert">当前浏览器不支持打印，请截图保存这一页，复查时给医生看。</p>
        <p v-else class="tip muted">在打印窗口里选择“另存为 PDF”即可保存。如果没有弹出打印窗口（例如在微信里打开），可以截图保存。</p>
      </div>
    </div>

    <article class="report">
      <header class="r-head">
        <h1>{{ store.profile.nickname || '孩子' }}的视觉档案报告</h1>
        <p>统计区间：{{ start }} 至 {{ today }}（近 {{ months }} 个月） · 生成日期：{{ today }}</p>
      </header>

      <!-- 1 孩子信息 -->
      <section class="sec">
        <h2>1. 孩子信息</h2>
        <dl class="kv">
          <div><dt>昵称</dt><dd>{{ store.profile.nickname || '—' }}</dd></div>
          <div><dt>出生年月</dt><dd>{{ birth }}</dd></div>
          <div><dt>年龄</dt><dd>{{ age }}</dd></div>
          <div><dt>下次复查</dt><dd>{{ nextDate || '未设置' }}</dd></div>
        </dl>
        <template v-if="current">
          <table class="tbl">
            <caption>当前处方（{{ current.date }}{{ current.hospital ? ` · ${current.hospital}` : '' }}{{ current.cycloplegic ? ' · 散瞳验光' : '' }}）</caption>
            <thead><tr><th></th><th>处方</th><th>矫正视力</th></tr></thead>
            <tbody>
              <tr><th>右眼 OD</th><td>{{ fmtRx(current.od) }}</td><td>{{ current.od.va ?? '—' }}</td></tr>
              <tr><th>左眼 OS</th><td>{{ fmtRx(current.os) }}</td><td>{{ current.os.va ?? '—' }}</td></tr>
            </tbody>
          </table>
          <p class="small">眼位：{{ EYE_POSITION_LABELS[current.eyePosition] }}<template v-if="current.advice"> · 医生建议：{{ current.advice }}</template></p>
        </template>
        <p v-else class="empty">暂无复查记录</p>
      </section>

      <!-- 2 戴镜 -->
      <section class="sec">
        <h2>2. 戴镜依从性</h2>
        <template v-if="wear.recorded">
          <p class="big-line">
            达标天（全天或大半天）占 <b>{{ wear.goodPct }}%</b>
            <span class="small">（已记录 {{ wear.recorded }} / {{ wear.totalDays }} 天，达标 {{ wear.good }} 天）</span>
          </p>
          <ul class="counts">
            <li v-for="l in LEVELS" :key="l"><i :class="['sw', l]"></i>{{ WEAR_LABELS[l] }} {{ wear.counts[l] }} 天</li>
            <li><i class="sw blank"></i>未记录 {{ wear.totalDays - wear.recorded }} 天</li>
          </ul>
          <div class="strip" role="img" :aria-label="`每日戴镜情况，${wear.strip[0].date} 至 ${today}`">
            <i v-for="d in wear.strip" :key="d.date" :class="['sw', d.wear ?? 'blank']" :title="`${d.date} ${d.wear ? WEAR_LABELS[d.wear] : '未记录'}`"></i>
          </div>
          <p class="strip-axis small"><span>{{ wear.strip[0].date }}</span><span>{{ today }}</span></p>
        </template>
        <p v-else class="empty">区间内没有戴镜记录</p>
      </section>

      <!-- 3 自测 -->
      <section class="sec">
        <h2>3. 近视力自测（家庭自测，小数视力）</h2>
        <table v-if="acuity.inRange.length" class="tbl">
          <caption>区间内共 {{ acuity.inRange.length }} 次</caption>
          <thead><tr><th>日期</th><th>右眼 OD</th><th>左眼 OS</th><th>提示</th></tr></thead>
          <tbody>
            <tr v-for="t in acuity.inRange" :key="t.id">
              <td>{{ t.date }}</td><td>{{ fmtEye(t.od.logmar) }}</td><td>{{ fmtEye(t.os.logmar) }}</td><td>{{ flagText(t) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">区间内没有自测记录</p>
        <template v-if="acuity.latest3.length">
          <h3>最近 3 次</h3>
          <ul class="list">
            <li v-for="t in acuity.latest3" :key="t.id">
              {{ t.date }}：右眼 {{ fmtEye(t.od.logmar) }}，左眼 {{ fmtEye(t.os.logmar) }}
              <span class="small">（{{ Math.round(t.distanceMm / 10) }} 厘米{{ t.flags.length ? `；${flagText(t)}` : '' }}）</span>
            </li>
          </ul>
        </template>
      </section>

      <!-- 4 观察 -->
      <section class="sec">
        <h2>4. 观察记录</h2>
        <p class="small">区间内填写观察清单 {{ obs.checklistCount }} 次，随时记录 {{ obs.notes.filter(n => n.source === 'observation').length }} 条。</p>
        <template v-if="obs.key.length">
          <h3>⚠ 重点信号（有时 / 经常）</h3>
          <ul class="list"><li v-for="k in obs.key" :key="k.id">{{ itemText(k.id) }} <span class="small">（{{ k.dates.map(shortDate).join('、') }}）</span></li></ul>
        </template>
        <template v-if="obs.often.length">
          <h3>“经常”出现的情况</h3>
          <ul class="list"><li v-for="k in obs.often" :key="k.id">{{ itemText(k.id) }} <span class="small">（{{ k.dates.map(shortDate).join('、') }}）</span></li></ul>
        </template>
        <template v-if="obs.notes.length">
          <h3>家长记录</h3>
          <ul class="list">
            <li v-for="(n, i) in obs.notes" :key="i">
              {{ n.date }}：{{ [n.items.map(itemText).join('；'), n.note].filter(Boolean).join(' — ') }}
            </li>
          </ul>
        </template>
        <p v-if="!obs.checklistCount && !obs.notes.length" class="empty">区间内没有观察记录</p>
        <p v-else-if="!obs.key.length && !obs.often.length" class="small">观察清单中没有重点信号或“经常”出现的情况。</p>
      </section>

      <!-- 5 训练 -->
      <section class="sec">
        <h2>5. 训练概况</h2>
        <p v-if="training.days">区间内训练 <b>{{ training.days }}</b> 天，共约 <b>{{ training.minutes }}</b> 分钟。</p>
        <p v-else class="empty">区间内没有训练记录</p>
        <ul v-if="training.categories.some(c => c.pct !== null)" class="cats">
          <li v-for="c in training.categories" :key="c.category">
            <span class="cat-name">{{ CATEGORY_ICONS[c.category] }} {{ CATEGORY_NAMES[c.category] }}</span>
            <b>{{ c.text }}</b>
            <span v-if="c.detail" class="small">{{ c.detail }}{{ c.games ? `（${c.games} 个游戏）` : '' }}</span>
          </li>
        </ul>
        <p class="small">比较区间内每个游戏第一次和最后一次的难度。游戏训练用于提高孩子的兴趣和配合度，不能替代戴镜和医院治疗。</p>
      </section>

      <!-- 6 声明 -->
      <section class="sec disclaimer">
        <p>本报告由家长记录及家庭自测生成，仅供医生参考，不作为诊断依据。家庭近视力自测受环境和配合程度影响，结果以医院检查为准。</p>
      </section>
    </article>
  </div>
</template>

<style scoped>
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px; }
.range { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; flex: 1 1 320px; }
.range button {
  min-height: 48px; padding: 0 14px; border: 2px solid var(--line); border-radius: 12px; background: var(--bg);
  color: var(--text); font: inherit; font-size: 16px; cursor: pointer;
}
.range button.sel { background: #d7ece9; border-color: var(--primary); font-weight: 700; }
.btn {
  min-height: 52px; padding: 0 20px; border: none; border-radius: 14px; font: inherit; font-size: 17px; cursor: pointer;
}
.btn.primary { background: var(--primary); color: var(--on-primary); }
.tip { flex-basis: 100%; margin: 0; font-size: 14px; line-height: 1.5; }
.tip.strong { color: #8a3a1f; font-weight: 700; }

.report { background: var(--surface); border-radius: var(--radius); padding: 20px var(--gutter); color: var(--text); }
.r-head { border-bottom: 2px solid var(--text); padding-bottom: 8px; margin-bottom: 8px; }
.r-head h1 { margin: 0; font-size: 22px; }
.r-head p { margin: 4px 0 0; font-size: 14px; color: var(--muted); }
.sec { padding: 10px 0; border-bottom: 1px solid var(--line); break-inside: avoid; page-break-inside: avoid; }
.sec h2 { margin: 0 0 8px; font-size: 18px; }
.sec h3 { margin: 10px 0 4px; font-size: 15px; }
.sec p { margin: 4px 0; line-height: 1.6; }
.small { font-size: 13px; color: var(--muted); }
.empty { color: var(--muted); font-size: 15px; }
.big-line b { font-size: 22px; }

.kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: 6px 16px; margin: 0 0 8px; }
.kv dt { font-size: 13px; color: var(--muted); }
.kv dd { margin: 0; font-size: 16px; font-weight: 700; }

.tbl { width: 100%; border-collapse: collapse; font-size: 14px; font-variant-numeric: tabular-nums; table-layout: fixed; }
.tbl caption { text-align: left; font-size: 14px; padding-bottom: 4px; color: var(--muted); }
.tbl th, .tbl td { border: 1px solid var(--line); padding: 6px; text-align: left; overflow-wrap: anywhere; vertical-align: top; }
.tbl thead th { background: var(--surface-2); font-weight: 700; }
.tbl tbody th { width: 5.5em; }

.counts { display: flex; flex-wrap: wrap; gap: 4px 16px; list-style: none; margin: 6px 0; padding: 0; font-size: 14px; }
.counts li { display: flex; align-items: center; gap: 6px; }
.strip { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 6px; }
.strip-axis { display: flex; justify-content: space-between; margin: 2px 0 0 !important; }
/* 档位：深色实心 / 中灰 / 斜纹 / 白底叉 / 虚线框，黑白打印也能区分 */
.sw {
  display: inline-block; width: 12px; height: 12px; border-radius: 2px; border: 1px solid #555; flex: none;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.sw.full { background: #1f5e5d; border-color: #1f5e5d; }
.sw.most { background: #8fc6c4; border-color: #4a8c8a; }
.sw.less { background: repeating-linear-gradient(45deg, #fff 0 2px, #b07a2a 2px 4px); border-color: #b07a2a; }
.sw.none { background: linear-gradient(45deg, transparent 44%, #a4472a 44% 56%, transparent 56%), #fff; border-color: #a4472a; }
.sw.blank { background: transparent; border: 1px dashed #b5ab98; }

.list { margin: 4px 0; padding-left: 20px; line-height: 1.6; font-size: 15px; }
.list li { overflow-wrap: anywhere; }
.cats { list-style: none; margin: 6px 0; padding: 0; display: grid; gap: 6px; }
.cats li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; font-size: 15px; }
.cat-name { min-width: 6.5em; }
.disclaimer { border-bottom: none; }
.disclaimer p { padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; font-size: 14px; }

@media print {
  .no-print { display: none !important; }
  .page { padding: 0; max-width: none; }
  .report { background: #fff; border-radius: 0; padding: 0; color: #000; }
  .r-head p, .small, .empty, .tbl caption, .kv dt { color: #333; }
  .tbl th, .tbl td { border-color: #666; }
  .tbl thead th { background: #eee; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sec { border-bottom-color: #999; }
  .disclaimer p { border-color: #666; }
}
</style>

<style>
/* 打印时取消 App 外壳的固定高度和内部滚动，让报告完整分页 */
@media print {
  @page { size: A4 portrait; margin: 12mm; }
  html, body, #app, .app, .app-main { height: auto !important; min-height: 0 !important; overflow: visible !important; background: #fff !important; }
  .app > .warn { display: none !important; }
}
</style>
