<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../../components/PageHeader.vue'
import LeaSymbol from '../../components/LeaSymbol.vue'
import { store } from '../../core/store'
import { todayKey } from '../../core/date'
import { speak } from '../../core/speech'
import {
  LEVELS, SYMBOLS, answerEye, bestMeasurable, flagsFor, needsRecheck, nextSymbol,
  optotypeCssPx, startEye, startLevel, type EyeRun,
} from '../../core/acuity'
import { ageMonths as calcAgeMonths, logmarToDecimal } from '../../core/ageNorms'
import type { AcuityTest } from '../../core/storage'

const props = defineProps<{ rng?: () => number }>()
const rng = () => (props.rng ?? Math.random)()
const router = useRouter()

type Eye = 'od' | 'os'
type Phase = 'nocal' | 'prep' | 'cover' | 'practice' | 'ready' | 'test' | 'result'

const NAMES: Record<string, string> = { apple: '苹果', house: '房子', circle: '圆圈', square: '方块' }
const PRACTICE_TRIALS = 2
const PRACTICE_LEVEL = 1.0

const pxPerMm = computed(() => store.calibration.pxPerMm)
const distanceMm = computed(() => store.settings.viewingDistanceMm || 400)
const dpr = () => (typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1)

const phase = ref<Phase>(pxPerMm.value ? 'prep' : 'nocal')
const eye = ref<Eye>('od')
const voice = ref(true)
const paused = ref(false)
const best = ref(0)
const run = ref<EyeRun | null>(null)
const runs: Partial<Record<Eye, EyeRun>> = {}
const symbol = ref<string>('apple')
const lastSymbol = ref<string | null>(null)
const practiceDone = ref(0)
const practiceFeedback = ref('')
const saved = ref<AcuityTest | null>(null)

const sortedTests = () =>
  store.acuityTests.map((t, i) => ({ t, i }))
    .sort((a, b) => (a.t.date < b.t.date ? -1 : a.t.date > b.t.date ? 1 : a.i - b.i))
    .map(x => x.t)
/** 开始本次测试前的最近一次记录 */
const prevTest = ref<AcuityTest | null>(null)

const eyeName = (e: Eye) => (e === 'od' ? '右眼' : '左眼')
const coverName = (e: Eye) => (e === 'od' ? '左眼' : '右眼')

// ---- 当前视标 ----
const level = computed(() => (phase.value === 'practice' ? PRACTICE_LEVEL : run.value?.level ?? PRACTICE_LEVEL))
const cssPx = computed(() => optotypeCssPx(level.value, distanceMm.value, pxPerMm.value ?? 1))
const levelNo = computed(() => LEVELS.findIndex(l => Math.round(l * 10) === Math.round(level.value * 10)) + 1)
const trialNo = computed(() => (phase.value === 'practice' ? practiceDone.value + 1 : (run.value?.trialsAtLevel.length ?? 0) + 1))

function pickPractice() {
  const pool = SYMBOLS.filter(s => s !== lastSymbol.value)
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
}
function present(s: string) {
  symbol.value = s
  if (voice.value) speak('这是什么？')
}

// ---- 流程 ----
function begin() {
  prevTest.value = sortedTests().slice(-1)[0] ?? null
  best.value = bestMeasurable(distanceMm.value, pxPerMm.value!, dpr())
  delete runs.od; delete runs.os
  eye.value = 'od'
  phase.value = 'cover'
}
function startPractice() {
  practiceDone.value = 0
  practiceFeedback.value = ''
  lastSymbol.value = null
  phase.value = 'practice'
  present(pickPractice())
}
function startReal() {
  const prev = prevTest.value ? prevTest.value[eye.value].logmar : undefined
  run.value = startEye(startLevel(prev, best.value), best.value)
  phase.value = 'test'
  present(nextSymbol(run.value, rng))
}

function answer(a: string) {
  if (paused.value) return
  if (phase.value === 'practice') {
    practiceFeedback.value = a === symbol.value ? '答对啦！' : `没关系，这是${NAMES[symbol.value]}`
    lastSymbol.value = symbol.value
    practiceDone.value++
    if (practiceDone.value >= PRACTICE_TRIALS) phase.value = 'ready'
    else present(pickPractice())
    return
  }
  if (phase.value !== 'test' || !run.value) return
  const r = answerEye(run.value, symbol.value, a)
  run.value = r
  if (!r.done) { present(nextSymbol(r, rng)); return }
  runs[eye.value] = r
  if (eye.value === 'od') {
    eye.value = 'os'
    run.value = null
    phase.value = 'cover'
  } else {
    finish()
  }
}

function finish() {
  const od = runs.od!, os = runs.os!
  const date = todayKey()
  const age = calcAgeMonths(store.profile.birthMonth, date)
  const prev = prevTest.value
  const rec: AcuityTest = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date,
    ageMonths: age,
    distanceMm: distanceMm.value,
    pxPerMm: pxPerMm.value!,
    bestMeasurableLogmar: best.value,
    od: { logmar: od.result, trials: od.allTrials },
    os: { logmar: os.result, trials: os.allTrials },
    flags: flagsFor(od.result, os.result, prev ? { od: prev.od.logmar, os: prev.os.logmar } : null, age, best.value),
  }
  store.acuityTests.push(rec)
  saved.value = rec
  run.value = null
  phase.value = 'result'
}

function restart() {
  paused.value = false
  run.value = null
  delete runs.od; delete runs.os
  phase.value = 'prep'
}

// ---- 切到后台时暂停 ----
const ACTIVE: Phase[] = ['practice', 'ready', 'test']
function onVisibility() {
  if (document.hidden && ACTIVE.includes(phase.value)) paused.value = true
}
onMounted(() => document.addEventListener('visibilitychange', onVisibility))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisibility))

// ---- 结果页 ----
const fmtDec = (l: number | null) => {
  if (l === null) return '< 0.1'
  const d = logmarToDecimal(l)
  return d >= 1 ? d.toFixed(1) : String(d)
}
const fmtLog = (l: number | null) => (l === null ? '> 1.0' : l.toFixed(1))
const t10 = (l: number | null) => (l === null ? 11 : Math.round(l * 10))
function compare(e: Eye): string {
  const p = prevTest.value
  if (!saved.value || !p) return '首次测试'
  const d = t10(saved.value[e].logmar) - t10(p[e].logmar)
  if (d < 0) return '进步'
  if (d > 0) return '下降'
  return '持平'
}
const advice = computed(() => (saved.value ? needsRecheck(store.acuityTests, todayKey()) : 'none'))
const FLAG_TEXT: Record<AcuityTest['flags'][number], string> = {
  'below-age': '有一只眼低于同龄参考线',
  interocular: '两眼相差 2 档或以上',
  decline: '比上次下降 2 档或以上',
}
const hitLimit = computed(() => {
  const s = saved.value
  if (!s || s.bestMeasurableLogmar <= 0) return false
  const b = t10(s.bestMeasurableLogmar)
  return t10(s.od.logmar) === b || t10(s.os.logmar) === b
})
</script>

<template>
  <div class="page" :class="{ fill: phase === 'practice' || phase === 'test' }">
    <PageHeader title="视力自测" back="/parent/acuity" back-label="‹">
      <button v-if="phase === 'practice' || phase === 'test'" type="button" class="pause" @click="paused = true">暂停</button>
    </PageHeader>

    <!-- 未校准 -->
    <section v-if="phase === 'nocal'" class="card center">
      <p class="lead">测试前需要先校准屏幕，视标尺寸才准确。</p>
      <RouterLink to="/parent/calibration" class="btn primary">去校准屏幕</RouterLink>
    </section>

    <!-- 准备页 -->
    <section v-else-if="phase === 'prep'" class="card prep">
      <h2>测试前准备</h2>
      <div class="prep-body">
        <svg class="illu" viewBox="0 0 220 130" role="img" aria-label="孩子坐好，屏幕离眼睛 40 厘米">
          <circle cx="40" cy="48" r="22" fill="#f6d2b0" stroke="#3d3a35" stroke-width="2" />
          <rect x="22" y="40" width="15" height="11" rx="4" fill="none" stroke="#3d3a35" stroke-width="2.5" />
          <rect x="43" y="40" width="15" height="11" rx="4" fill="none" stroke="#3d3a35" stroke-width="2.5" />
          <line x1="37" y1="45" x2="43" y2="45" stroke="#3d3a35" stroke-width="2" />
          <path d="M22 72 Q40 64 58 72 L64 120 H16 Z" fill="#4aa3a2" />
          <rect x="176" y="22" width="14" height="70" rx="4" fill="#3d3a35" />
          <rect x="179" y="27" width="8" height="60" fill="#fff" />
          <line x1="62" y1="104" x2="176" y2="104" stroke="#f2a541" stroke-width="3" stroke-dasharray="6 5" />
          <path d="M62 98 v12 M176 98 v12" stroke="#f2a541" stroke-width="3" />
          <text x="119" y="96" text-anchor="middle" font-size="16" fill="#3d3a35" font-weight="700">40 厘米</text>
          <circle cx="196" cy="14" r="10" fill="#f2a541" opacity="0.7" />
        </svg>
        <ul class="checklist">
          <li>👓 <b>戴着眼镜测</b>（平时戴的那副）</li>
          <li>💡 <b>光线充足</b>，屏幕不反光，亮度调高</li>
          <li>📏 孩子坐稳，屏幕离眼睛 <b>{{ distanceMm / 10 }} 厘米</b>：用卷尺量，或剪一根 {{ distanceMm / 10 }} 厘米长的绳子比一下</li>
        </ul>
      </div>
      <p v-if="!store.profile.birthMonth" class="muted small">
        未填写出生年月，本次不做同龄参考判断。<RouterLink to="/parent/settings">去填写</RouterLink>
      </p>
      <label class="voice"><input v-model="voice" type="checkbox" /> 语音提问"这是什么？"</label>
      <button type="button" class="btn primary" @click="begin">准备好了</button>
    </section>

    <!-- 遮眼指引 -->
    <section v-else-if="phase === 'cover'" class="card prep">
      <h2>{{ eye === 'os' ? '换眼：' : '' }}测{{ eyeName(eye) }}</h2>
      <div class="prep-body">
        <svg class="illu" viewBox="0 0 160 130" role="img" :aria-label="`用手掌轻轻挡住${coverName(eye)}`">
          <circle cx="80" cy="62" r="46" fill="#f6d2b0" stroke="#3d3a35" stroke-width="2" />
          <!-- 孩子的右眼在画面左侧 -->
          <circle :cx="eye === 'od' ? 62 : 98" cy="56" r="6" fill="#3d3a35" />
          <rect x="49" y="46" width="26" height="20" rx="7" fill="none" stroke="#3d3a35" stroke-width="3" />
          <rect x="85" y="46" width="26" height="20" rx="7" fill="none" stroke="#3d3a35" stroke-width="3" />
          <path d="M70 84 Q80 92 90 84" fill="none" stroke="#3d3a35" stroke-width="2.5" stroke-linecap="round" />
          <g :transform="eye === 'od' ? 'translate(78 24)' : 'translate(4 24) scale(-1 1) translate(-78 0)'">
            <path d="M8 16 q2 -14 10 -12 q4 -10 10 -2 q6 -6 10 4 q8 -2 8 8 l-2 34 q-2 14 -18 14 h-6 q-14 0 -16 -14 z" fill="#e8b48e" stroke="#3d3a35" stroke-width="2" opacity="0.95" />
          </g>
        </svg>
        <ul class="checklist">
          <li>✋ 用手掌或遮眼贴 <b>挡住{{ coverName(eye) }}</b></li>
          <li>轻轻挡住，<b>别压眼睛</b>，也别从指缝偷看</li>
          <li>孩子说出图形名字或用手指，家长点下方对应按钮</li>
        </ul>
      </div>
      <button type="button" class="btn primary" @click="startPractice">先练习 2 题</button>
    </section>

    <!-- 练习完成 -->
    <section v-else-if="phase === 'ready'" class="card center">
      <p class="lead">练习完成！接下来正式测{{ eyeName(eye) }}，答错了也没关系。</p>
      <p class="muted small">{{ practiceFeedback }}</p>
      <button type="button" class="btn primary" @click="startReal">开始正式测试</button>
    </section>

    <!-- 练习 / 正式测试 -->
    <section v-else-if="phase === 'practice' || phase === 'test'" class="runner">
      <p class="meta">
        {{ eyeName(eye) }} · {{ phase === 'practice' ? '练习' : '正式' }} ·
        第 {{ levelNo }} 档 / 小数视力 {{ fmtDec(level) }} · 第 {{ trialNo }} 题
        <span v-if="phase === 'practice' && practiceFeedback" class="fb">{{ practiceFeedback }}</span>
      </p>
      <div class="stimulus" data-test="stimulus">
        <LeaSymbol :symbol="symbol" :css-px="cssPx" crowded />
      </div>
      <div class="answers">
        <button
          v-for="s in SYMBOLS" :key="s" type="button" class="ans" :aria-label="NAMES[s]" :data-answer="s"
          @click="answer(s)"
        >
          <LeaSymbol :symbol="s" :css-px="64" />
          <span>{{ NAMES[s] }}</span>
        </button>
        <button type="button" class="ans unseen" data-answer="unseen" @click="answer('unseen')">看不清</button>
      </div>
    </section>

    <!-- 结果页 -->
    <section v-else-if="phase === 'result' && saved" class="result">
      <div class="eyes">
        <div v-for="e in (['od', 'os'] as const)" :key="e" class="card eye-card">
          <h3>{{ eyeName(e) }}（{{ e.toUpperCase() }}）</h3>
          <p class="big">{{ fmtDec(saved[e].logmar) }}</p>
          <p class="muted small">logMAR {{ fmtLog(saved[e].logmar) }}</p>
          <p class="cmp" :class="compare(e)">与上次相比：{{ compare(e) }}</p>
        </div>
      </div>
      <div class="card msg" :class="advice">
        <template v-if="advice === 'none'">
          <p class="lead">本次结果正常，继续坚持戴镜。</p>
          <p>下次建议 2–4 周后再测。</p>
        </template>
        <template v-else-if="advice === 'retest'">
          <p class="lead">孩子可能累了或没配合好，建议 1 周内重测一次。</p>
        </template>
        <template v-else>
          <p class="lead">建议近期带孩子去医院复查（家庭自测仅供参考）。</p>
        </template>
        <ul v-if="saved.flags.length" class="flags">
          <li v-for="f in saved.flags" :key="f">{{ FLAG_TEXT[f] }}</li>
        </ul>
        <p v-if="hitLimit" class="muted small">
          本设备最好只能测到 {{ fmtDec(saved.bestMeasurableLogmar) }}（logMAR {{ fmtLog(saved.bestMeasurableLogmar) }}），实际视力可能更好。
        </p>
      </div>
      <div class="row">
        <button type="button" class="btn soft" @click="router.push('/parent')">返回</button>
        <button type="button" class="btn primary" @click="router.push('/parent/acuity')">查看趋势</button>
      </div>
    </section>

    <!-- 暂停遮罩 -->
    <div v-if="paused" class="overlay" role="dialog" aria-label="已暂停">
      <div class="card center">
        <p class="lead">已暂停</p>
        <p class="muted small">重新开始会从头测两只眼，本次进度不保存。</p>
        <div class="row">
          <button type="button" class="btn primary" @click="paused = false">继续</button>
          <button type="button" class="btn soft" @click="restart">重新开始</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page.fill { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
.center { text-align: center; }
h2 { font-size: 22px; margin: 0 0 12px; }
h3 { font-size: 18px; margin: 0 0 4px; }
.lead { font-size: 20px; font-weight: 700; line-height: 1.5; margin: 0 0 12px; }
.small { font-size: 14px; }
.prep-body { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
.illu { width: 100%; max-width: 260px; height: auto; flex: 0 1 260px; margin: 0 auto; }
.checklist { flex: 1 1 280px; margin: 0; padding-left: 4px; list-style: none; font-size: 18px; line-height: 1.6; }
.checklist li { margin-bottom: 8px; }
.voice { display: flex; align-items: center; gap: 8px; font-size: 16px; margin: 12px 0; min-height: 44px; }
.voice input { width: 24px; height: 24px; accent-color: var(--primary); }
.btn {
  display: inline-flex; align-items: center; justify-content: center; min-height: 64px; padding: 0 28px;
  border: none; border-radius: 18px; font: inherit; font-size: 20px; font-weight: 700; cursor: pointer;
  text-decoration: none;
}
.btn.primary { background: var(--primary); color: var(--on-primary); }
.btn.soft { background: var(--surface-2); color: var(--text); }
.pause {
  min-height: 48px; padding: 0 14px; border: none; border-radius: 14px; background: var(--surface);
  font: inherit; font-size: 16px; color: var(--text); cursor: pointer;
}

.runner { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; }
.meta { margin: 0; font-size: 13px; color: var(--muted); text-align: center; }
.fb { margin-left: 8px; color: var(--primary-dark); font-weight: 700; }
.stimulus {
  flex: 1; min-height: 160px; display: flex; align-items: center; justify-content: center;
  background: #fff; border-radius: var(--radius);
}
.answers { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; max-width: 640px; width: 100%; margin: 0 auto; }
.ans {
  min-height: 88px; min-width: 72px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  border: 2px solid var(--line); border-radius: 18px; background: #fff; color: var(--text);
  font: inherit; font-size: 14px; cursor: pointer; padding: 6px;
}
.ans:active { background: var(--surface-2); }
.ans.unseen { grid-column: 1 / -1; min-height: 72px; font-size: 20px; font-weight: 700; background: var(--surface-2); }

.result { display: flex; flex-direction: column; gap: 16px; }
.eyes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.eye-card { text-align: center; }
.big { font-size: 44px; font-weight: 800; margin: 4px 0; color: var(--primary-dark); }
.cmp { margin: 8px 0 0; font-weight: 700; }
.cmp.进步 { color: #2f7d4f; }
.cmp.下降 { color: #b4552a; }
.msg.retest { border-left: 8px solid var(--accent); }
.msg.see-doctor { border-left: 8px solid #c0573a; }
.msg.none { border-left: 8px solid var(--primary); }
.msg p { margin: 0 0 6px; font-size: 17px; }
.flags { margin: 6px 0; padding-left: 20px; font-size: 15px; }
.row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.row .btn { flex: 1 1 140px; max-width: 280px; }

.overlay {
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  background: rgba(61, 58, 53, 0.55); padding: var(--gutter);
}
.overlay .card { max-width: 420px; width: 100%; }
</style>
