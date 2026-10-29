<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { store } from '../../core/store'
import { CHECK_ITEMS, checklistFindings } from '../../core/checklist'
import type { Checklist, Freq, Observation } from '../../core/storage'
import { daysBetween, todayKey } from '../../core/date'
import { newId } from '../../core/visits'

const today = todayKey()
const FREQS: { v: Freq; label: string }[] = [
  { v: 'no', label: '没有' }, { v: 'sometimes', label: '有时' }, { v: 'often', label: '经常' },
]
const FREQ_LABEL: Record<Freq, string> = { no: '没有', sometimes: '有时', often: '经常' }
const itemText = (id: string) => CHECK_ITEMS.find(i => i.id === id)?.text.replace(/[？?]$/, '') ?? id

// ---- 月度清单 ----
const lastCheck = computed(() => [...store.checklists].sort((a, b) => (a.date < b.date ? 1 : -1))[0])
const lastAge = computed(() => (lastCheck.value ? daysBetween(lastCheck.value.date, today) : null))

const answers = reactive<Record<string, Freq | undefined>>({})
const checkNote = ref('')
const showForm = ref(true)
const result = ref<Checklist | null>(null)
const resultFindings = computed(() => (result.value ? checklistFindings(result.value) : null))
const unanswered = computed(() => CHECK_ITEMS.filter(i => !answers[i.id]).length)

function submitChecklist() {
  if (unanswered.value) return
  const c: Checklist = {
    id: newId(), date: todayKey(),
    answers: Object.fromEntries(CHECK_ITEMS.map(i => [i.id, answers[i.id]!])) as Record<string, Freq>,
    note: checkNote.value.trim(),
  }
  store.checklists.push(c)
  result.value = c
  for (const i of CHECK_ITEMS) delete answers[i.id]
  checkNote.value = ''
  showForm.value = false
}

// ---- 随时记录 ----
const showQuick = ref(false)
const quick = reactive({ date: today, items: [] as string[], note: '' })
const quickError = ref('')
const quickSaved = ref(false)

function toggleItem(id: string) {
  const i = quick.items.indexOf(id)
  if (i >= 0) quick.items.splice(i, 1)
  else quick.items.push(id)
}
function saveQuick() {
  if (!quick.date) { quickError.value = '请选择日期'; return }
  if (quick.date > todayKey()) { quickError.value = '日期不能晚于今天'; return }
  if (!quick.items.length && !quick.note.trim()) { quickError.value = '请至少选一项，或写一句备注'; return }
  const o: Observation = {
    id: newId(), date: quick.date,
    items: CHECK_ITEMS.map(i => i.id).filter(id => quick.items.includes(id)),
    note: quick.note.trim(),
  }
  store.observations.push(o)
  Object.assign(quick, { date: todayKey(), items: [], note: '' })
  quickError.value = ''
  quickSaved.value = true
  showQuick.value = false
}
function openQuick() { showQuick.value = true; quickSaved.value = false; quickError.value = '' }

// ---- 眼位指引 ----
const showGuide = ref(false)

// ---- 时间线 ----
type Entry =
  | { kind: 'checklist'; id: string; date: string; c: Checklist; f: { key: string[]; often: string[] } }
  | { kind: 'obs'; id: string; date: string; o: Observation }

const entries = computed<Entry[]>(() =>
  [
    ...store.checklists.map(c => ({ kind: 'checklist' as const, id: c.id, date: c.date, c, f: checklistFindings(c) })),
    ...store.observations.map(o => ({ kind: 'obs' as const, id: o.id, date: o.date, o })),
  ].sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.id < b.id ? 1 : -1)),
)

function remove(e: Entry) {
  const what = e.kind === 'checklist' ? '这份观察清单' : '这条记录'
  if (!confirm(`确定删除 ${e.date} 的${what}吗？删除后无法恢复。`)) return
  const list: { id: string }[] = e.kind === 'checklist' ? store.checklists : store.observations
  const i = list.findIndex(x => x.id === e.id)
  if (i >= 0) list.splice(i, 1)
  if (result.value?.id === e.id) result.value = null
}
</script>

<template>
  <div class="page">
    <PageHeader title="异常信号观察" back="/parent" back-label="‹" />

    <!-- 月度清单 -->
    <section class="card">
      <h2>每月观察清单</h2>
      <p class="muted lead">
        每月填一次，约 2 分钟。按最近一个月的日常表现选择。
        <template v-if="lastAge !== null">上次填写：{{ lastCheck!.date }}（{{ lastAge }} 天前）。</template>
        <template v-else>还没有填过。</template>
      </p>

      <div v-if="result && resultFindings" class="result" :class="{ alert: resultFindings.key.length }" role="status">
        <template v-if="resultFindings.key.length">
          <p class="result-title">⚠️ 建议近期咨询医生</p>
          <p>以下情况需要留意：</p>
          <ul><li v-for="id in resultFindings.key" :key="id">{{ itemText(id) }}（{{ FREQ_LABEL[result.answers[id]] }}）</li></ul>
        </template>
        <template v-if="resultFindings.often.length">
          <p class="result-title sub">📝 复查时可以告诉医生</p>
          <ul><li v-for="id in resultFindings.often" :key="id">{{ itemText(id) }}（经常）</li></ul>
        </template>
        <p v-if="!resultFindings.key.length && !resultFindings.often.length" class="result-title ok">✅ 已保存，这次没有发现明显的异常信号。</p>
        <p v-else class="muted small">已保存，这些内容会写进给医生的报告。</p>
      </div>

      <button v-if="!showForm" type="button" class="btn ghost" @click="showForm = true">再填一份</button>

      <form v-if="showForm" class="checklist" @submit.prevent="submitChecklist">
        <fieldset v-for="(it, n) in CHECK_ITEMS" :key="it.id" class="q">
          <legend>
            <span class="qn">{{ n + 1 }}</span>{{ it.text }}
            <span v-if="it.key" class="tag">重点</span>
          </legend>
          <div class="opts" role="radiogroup" :aria-label="it.text">
            <button
              v-for="f in FREQS" :key="f.v" type="button" class="opt" :class="[f.v, { sel: answers[it.id] === f.v }]"
              role="radio" :aria-checked="answers[it.id] === f.v" :data-item="it.id" :data-freq="f.v"
              @click="answers[it.id] = f.v"
            >{{ f.label }}</button>
          </div>
        </fieldset>
        <label class="field">
          <span>备注（选填）</span>
          <textarea v-model="checkNote" rows="2" maxlength="300" placeholder="例如：累的时候更明显"></textarea>
        </label>
        <button type="submit" class="btn primary wide" :disabled="unanswered > 0">
          {{ unanswered ? `还有 ${unanswered} 项未选` : '提交本月清单' }}
        </button>
      </form>
    </section>

    <!-- 随时记录 -->
    <section class="card">
      <h2>随时记录</h2>
      <p v-if="quickSaved" class="saved" role="status">✅ 已记下，会显示在下面的时间线里。</p>
      <button v-if="!showQuick" type="button" class="btn accent wide" @click="openQuick">✏️ 我发现了异常</button>
      <form v-else class="quick" @submit.prevent="saveQuick">
        <label class="field">
          <span>日期</span>
          <input v-model="quick.date" type="date" :max="today" class="text" />
        </label>
        <div class="field">
          <span>发现了什么（可多选）</span>
          <div class="chips">
            <button
              v-for="it in CHECK_ITEMS" :key="it.id" type="button" class="chip" :class="{ sel: quick.items.includes(it.id) }"
              :aria-pressed="quick.items.includes(it.id)" @click="toggleItem(it.id)"
            >{{ itemText(it.id) }}</button>
          </div>
        </div>
        <label class="field">
          <span>备注</span>
          <textarea v-model="quick.note" rows="3" maxlength="300" placeholder="什么时候、什么情况下看到的？"></textarea>
        </label>
        <p v-if="quickError" class="error" role="alert">{{ quickError }}</p>
        <div class="row">
          <button type="submit" class="btn primary">保存</button>
          <button type="button" class="btn ghost" @click="showQuick = false">取消</button>
        </div>
      </form>
    </section>

    <!-- 眼位指引 -->
    <section class="card">
      <button type="button" class="toggle" :aria-expanded="showGuide" @click="showGuide = !showGuide">
        <span>👁️ 怎么在家看眼位</span><span class="chev">{{ showGuide ? '收起 ▲' : '展开 ▼' }}</span>
      </button>
      <div v-if="showGuide" class="guide">
        <h3>1. 看光点</h3>
        <p>在约 50 厘米处，用手电筒对着孩子的鼻梁照，让孩子看着手电筒。看两个瞳孔上的小白光点是不是都在瞳孔中央、左右对称。</p>
        <div class="figs">
          <figure>
            <svg viewBox="0 0 240 100" role="img" aria-label="正常：两眼光点都在瞳孔中央">
              <g v-for="cx in [65, 175]" :key="cx">
                <ellipse :cx="cx" cy="50" rx="42" ry="24" class="sclera" />
                <circle :cx="cx" cy="50" r="17" class="iris" />
                <circle :cx="cx" cy="50" r="8" class="pupil" />
                <circle :cx="cx" cy="50" r="3.5" class="reflex" />
              </g>
              <path d="M120 40 q-6 22 0 30" class="nose" />
            </svg>
            <figcaption>✅ 正常：两边光点都在瞳孔中央，左右对称</figcaption>
          </figure>
          <figure>
            <svg viewBox="0 0 240 100" role="img" aria-label="内斜：偏斜眼的光点偏向外侧">
              <!-- 画面左侧是孩子的右眼：黑眼珠往鼻子一侧偏，光点留在原处，看起来偏向瞳孔外侧 -->
              <ellipse cx="65" cy="50" rx="42" ry="24" class="sclera" />
              <circle cx="85" cy="50" r="17" class="iris" />
              <circle cx="85" cy="50" r="8" class="pupil" />
              <circle cx="72" cy="50" r="3.5" class="reflex" />
              <ellipse cx="175" cy="50" rx="42" ry="24" class="sclera" />
              <circle cx="175" cy="50" r="17" class="iris" />
              <circle cx="175" cy="50" r="8" class="pupil" />
              <circle cx="175" cy="50" r="3.5" class="reflex" />
              <path d="M120 40 q-6 22 0 30" class="nose" />
              <!-- 箭头：黑眼珠往鼻子方向偏 -->
              <path d="M72 88 h22" class="arrow" />
              <path d="M90 83 l5 5 l-5 5" class="arrow" />
            </svg>
            <figcaption>⚠️ 内斜：一只眼的黑眼珠往鼻子方向偏，这只眼的光点看起来偏向外侧（耳朵一侧）</figcaption>
          </figure>
        </div>

        <h3>2. 遮一遮</h3>
        <p>让孩子盯着前方一个小玩具。用手或卡片遮住一只眼，等 2–3 秒再移开，看<b>这只眼</b>在移开的一瞬间有没有动（转回来看玩具）。两只眼各做一次，戴镜、摘镜时可以各看一次。</p>
        <div class="steps">
          <figure v-for="s in 3" :key="s">
            <svg viewBox="0 0 160 90" role="img" :aria-label="['看玩具', '遮住一只眼', '移开，看这只眼动不动'][s - 1]">
              <g v-for="cx in [45, 115]" :key="cx">
                <ellipse :cx="cx" cy="50" rx="26" ry="15" class="sclera" />
                <circle :cx="s === 3 && cx === 45 ? 53 : cx" cy="50" r="10" class="iris" />
                <circle :cx="s === 3 && cx === 45 ? 53 : cx" cy="50" r="5" class="pupil" />
              </g>
              <text x="80" y="16" class="toy">🧸</text>
              <rect v-if="s === 2" x="12" y="26" width="64" height="48" rx="8" class="cover" />
              <g v-if="s === 3">
                <path d="M53 76 h-14" class="arrow" />
                <path d="M43 72 l-4 4 l4 4" class="arrow" />
              </g>
            </svg>
            <figcaption>{{ s }}. {{ ['盯着玩具', '遮住一只眼 2–3 秒', '移开，看这只眼有没有动'][s - 1] }}</figcaption>
          </figure>
        </div>

        <p>光点不对称，或者移开遮挡时眼睛有明显移动，都可以用上面的“我发现了异常”记下来，并咨询医生。</p>
        <p class="disclaimer">家长观察只能发现比较明显的问题。看着正常，也不能代替医院的检查，请按医生要求按时复查。</p>
      </div>
    </section>

    <!-- 时间线 -->
    <section class="card">
      <h2>观察记录</h2>
      <p v-if="!entries.length" class="muted">还没有记录。</p>
      <ol v-else class="timeline">
        <li v-for="e in entries" :key="e.kind + e.id" class="entry" :class="{ alert: e.kind === 'checklist' && e.f.key.length }">
          <div class="entry-head">
            <span class="date">{{ e.date }}</span>
            <span class="kind">{{ e.kind === 'checklist' ? '月度清单' : '随时记录' }}</span>
            <button type="button" class="del" :aria-label="`删除 ${e.date} 的记录`" @click="remove(e)">删除</button>
          </div>
          <template v-if="e.kind === 'checklist'">
            <p v-if="e.f.key.length" class="line strong">⚠️ 需要留意：{{ e.f.key.map(id => `${itemText(id)}（${FREQ_LABEL[e.c.answers[id]]}）`).join('；') }}</p>
            <p v-if="e.f.often.length" class="line">📝 经常：{{ e.f.often.map(itemText).join('；') }}</p>
            <p v-if="!e.f.key.length && !e.f.often.length" class="line muted">未发现明显异常信号</p>
            <p v-if="e.c.note" class="line note">备注：{{ e.c.note }}</p>
          </template>
          <template v-else>
            <p v-if="e.o.items.length" class="line">{{ e.o.items.map(itemText).join('；') }}</p>
            <p v-if="e.o.note" class="line note">{{ e.o.note }}</p>
          </template>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.card { margin-bottom: 16px; }
h2 { font-size: 20px; margin: 0 0 8px; }
h3 { font-size: 17px; margin: 16px 0 6px; }
p { line-height: 1.6; }
.lead { margin: 0 0 12px; font-size: 15px; }
.small { font-size: 14px; margin: 6px 0 0; }

.checklist { display: grid; gap: 14px; }
.q { border: none; margin: 0; padding: 0 0 14px; border-bottom: 1px solid var(--line); min-width: 0; }
legend { padding: 0; margin-bottom: 10px; font-size: 17px; line-height: 1.5; }
.qn {
  display: inline-grid; place-items: center; width: 26px; height: 26px; margin-right: 6px; border-radius: 50%;
  background: var(--surface-2); font-size: 14px; font-weight: 700; vertical-align: 1px;
}
.tag { margin-left: 6px; padding: 1px 8px; border-radius: 999px; background: #f6dfb4; color: #6b4a14; font-size: 13px; white-space: nowrap; }
.opts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.opt {
  min-height: 52px; border: 2px solid var(--line); border-radius: 14px; background: var(--bg); color: var(--text);
  font: inherit; font-size: 18px; cursor: pointer;
}
.opt.sel { font-weight: 700; }
.opt.no.sel { background: #d7ece9; border-color: var(--primary); }
.opt.sometimes.sel { background: #f6dfb4; border-color: var(--accent); }
.opt.often.sel { background: #f0cdbd; border-color: #c0704e; }

.field { display: flex; flex-direction: column; gap: 6px; font-size: 16px; }
textarea, .text {
  width: 100%; min-height: 48px; padding: 10px 12px; font: inherit; font-size: 17px; border: 2px solid var(--line);
  border-radius: 12px; background: var(--bg); color: var(--text);
}
.btn {
  min-height: 52px; padding: 0 22px; border: none; border-radius: 14px; font: inherit; font-size: 18px; cursor: pointer;
}
.btn.primary { background: var(--primary); color: var(--on-primary); }
.btn.primary:disabled { background: var(--surface-2); color: var(--muted); cursor: not-allowed; }
.btn.accent { background: var(--accent); color: #3d2a0c; font-weight: 700; }
.btn.ghost { background: var(--surface-2); color: var(--text); }
.btn.wide { width: 100%; }
.row { display: flex; flex-wrap: wrap; gap: 12px; }

.result { margin: 0 0 14px; padding: 14px 16px; border-radius: 16px; background: #e3f0ec; }
.result.alert { background: #f8e0d4; border: 2px solid #c0704e; }
.result p, .result ul { margin: 4px 0; }
.result ul { padding-left: 22px; line-height: 1.6; }
.result-title { font-size: 19px; font-weight: 700; }
.result-title.sub { font-size: 17px; margin-top: 10px; }
.result-title.ok { font-size: 17px; }
.saved { margin: 0 0 12px; padding: 10px 14px; border-radius: 12px; background: #e3f0ec; }
.error { margin: 0; color: #a4472a; font-weight: 700; }

.quick { display: grid; gap: 14px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  min-height: 48px; padding: 8px 14px; border: 2px solid var(--line); border-radius: 14px; background: var(--bg);
  color: var(--text); font: inherit; font-size: 16px; text-align: left; cursor: pointer; max-width: 100%;
}
.chip.sel { background: #f6dfb4; border-color: var(--accent); font-weight: 700; }

.toggle {
  width: 100%; min-height: 52px; display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding: 0 4px; border: none; background: none; color: var(--text); font: inherit; font-size: 19px; font-weight: 700; cursor: pointer;
}
.chev { font-size: 15px; font-weight: 400; color: var(--muted); white-space: nowrap; }
.guide p { margin: 6px 0; }
.figs { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); }
.steps { display: grid; gap: 8px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
figure { margin: 0; padding: 10px; border-radius: 16px; background: var(--bg); min-width: 0; }
figure svg { width: 100%; height: auto; display: block; }
figcaption { margin-top: 6px; font-size: 14px; line-height: 1.5; }
.sclera { fill: #fff; stroke: var(--text); stroke-width: 2; }
.iris { fill: #8a6a4a; }
.pupil { fill: #1d1b18; }
.reflex { fill: #fff; stroke: #f2a541; stroke-width: 1; }
.nose { fill: none; stroke: var(--muted); stroke-width: 2; stroke-linecap: round; }
.arrow { fill: none; stroke: #c0704e; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.cover { fill: var(--accent); opacity: 0.92; }
.toy { font-size: 16px; text-anchor: middle; }
.disclaimer { margin-top: 12px !important; padding: 10px 14px; border-radius: 12px; background: var(--surface-2); font-size: 15px; }

.timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.entry { padding: 12px 14px; border-radius: 16px; background: var(--bg); border-left: 6px solid var(--line); min-width: 0; }
.entry.alert { border-left-color: #c0704e; }
.entry-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.date { font-weight: 700; font-size: 17px; }
.kind { padding: 2px 10px; border-radius: 999px; background: var(--surface-2); font-size: 14px; }
.del {
  margin-left: auto; min-height: 48px; min-width: 64px; padding: 0 14px; border: none; border-radius: 12px;
  background: transparent; color: #a4472a; font: inherit; font-size: 16px; cursor: pointer;
}
.line { margin: 4px 0 0; overflow-wrap: anywhere; }
.line.strong { font-weight: 700; color: #8a3a1f; }
.note { color: var(--muted); }
</style>
