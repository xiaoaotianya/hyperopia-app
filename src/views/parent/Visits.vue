<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { store } from '../../core/store'
import type { EyeRx, Visit } from '../../core/storage'
import { daysBetween, todayKey } from '../../core/date'
import { downloadText, recheckIcs } from '../../core/ics'
import {
  EYE_POSITION_LABELS, addMonths, draftFromVisit, emptyDraft, fmtDiopter, fmtRx, isSignificant, newId, rxChange,
  sortVisitsDesc, validateVisit, type EyeDraft, type VisitDraft, type VisitErrors,
} from '../../core/visits'

const today = todayKey()
const sorted = computed(() => sortVisitsDesc(store.visits))
const current = computed(() => sorted.value[0])
const cards = computed(() => sorted.value.map((v, i) => ({ v, prev: sorted.value[i + 1], change: rxChange(v, sorted.value[i + 1]) })))
const nextInfo = computed(() => {
  const d = current.value?.nextDate
  if (!d) return null
  const n = daysBetween(today, d)
  return { date: d, n, text: n < 0 ? `已过 ${-n} 天，请尽快安排复查` : n === 0 ? '就是今天' : `还有 ${n} 天` }
})

const EYES = [{ k: 'od', label: '右眼 OD' }, { k: 'os', label: '左眼 OS' }] as const
const POSITIONS = Object.entries(EYE_POSITION_LABELS) as [Visit['eyePosition'], string][]
const fmtVa = (va: number | null) => (va === null ? '—' : String(va))
const fmtAxis = (rx: EyeRx) => (Math.abs(rx.cyl) < 1e-9 ? '—' : `${rx.axis}°`)

// ---- 表单 ----
const formOpen = ref(false)
const editingId = ref<string | null>(null)
const draft = reactive<VisitDraft>(emptyDraft(today))
const errors = ref<VisitErrors>({})
const formEl = ref<HTMLElement | null>(null)

async function openForm(v?: Visit) {
  Object.assign(draft, v ? draftFromVisit(v) : emptyDraft(todayKey()))
  editingId.value = v?.id ?? null
  errors.value = {}
  formOpen.value = true
  await nextTick()
  formEl.value?.scrollIntoView?.({ block: 'start' })
}
function closeForm() { formOpen.value = false; editingId.value = null }

const blank = (v: unknown) => v === null || v === undefined || String(v).trim() === ''
function preview(v: unknown): string {
  if (blank(v)) return ''
  const n = Number(String(v).trim().replace(/^\+/, ''))
  return Number.isFinite(n) ? `${fmtDiopter(n)} D` : ''
}
function flipSign(eye: EyeDraft, f: 'sph' | 'cyl') {
  if (blank(eye[f])) return
  const n = Number(String(eye[f]).trim().replace(/^\+/, ''))
  if (Number.isFinite(n)) eye[f] = n === 0 ? 0 : -n
}
function setNext(months: number) {
  draft.nextDate = addMonths(draft.date && draft.date <= today ? draft.date : today, months)
  delete errors.value.nextDate
}

async function save() {
  const r = validateVisit(draft, todayKey())
  if (!r.ok) {
    errors.value = r.errors
    await nextTick()
    formEl.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus?.()
    return
  }
  if (editingId.value) {
    const i = store.visits.findIndex(x => x.id === editingId.value)
    if (i >= 0) store.visits[i] = { id: editingId.value, ...r.visit }
  } else {
    store.visits.push({ id: newId(), ...r.visit })
  }
  closeForm()
}

function remove(v: Visit) {
  if (!confirm(`确定删除 ${v.date} 的复查记录吗？删除后无法恢复。`)) return
  const i = store.visits.findIndex(x => x.id === v.id)
  if (i >= 0) store.visits.splice(i, 1)
}

function addToCalendar(v: Visit) {
  downloadText(`复查提醒-${v.nextDate}.ics`, recheckIcs(v.nextDate), 'text/calendar')
}

const deltaText = (d: number) => (d > 0 ? `+${d.toFixed(2)}` : d.toFixed(2))
</script>

<template>
  <div class="page">
    <PageHeader title="复查与处方" back="/parent" back-label="‹" />

    <!-- 表单 -->
    <section v-if="formOpen" ref="formEl" class="card form-card">
      <h2>{{ editingId ? '编辑复查记录' : '新增复查记录' }}</h2>
      <form novalidate @submit.prevent="save">
        <div class="grid2">
          <label class="field">
            <span>复查日期 <em>*</em></span>
            <input v-model="draft.date" type="date" :max="today" class="text" name="date" :aria-invalid="!!errors.date" />
            <small v-if="errors.date" class="err">{{ errors.date }}</small>
          </label>
          <label class="field">
            <span>医院 / 医生</span>
            <input v-model="draft.hospital" type="text" maxlength="40" class="text" placeholder="选填" name="hospital" />
          </label>
        </div>

        <div class="field">
          <span>是否散瞳验光</span>
          <div class="seg">
            <button type="button" :class="{ sel: draft.cycloplegic }" :aria-pressed="draft.cycloplegic" @click="draft.cycloplegic = true">是</button>
            <button type="button" :class="{ sel: !draft.cycloplegic }" :aria-pressed="!draft.cycloplegic" @click="draft.cycloplegic = false">否</button>
          </div>
        </div>

        <div class="eyes">
          <fieldset v-for="e in EYES" :key="e.k" class="eye">
            <legend>{{ e.label }}</legend>
            <div class="grid2 tight">
              <div v-for="f in (['sph', 'cyl'] as const)" :key="f" class="field">
                <label :for="`${e.k}-${f}`">{{ f === 'sph' ? '球镜 SPH' : '柱镜 CYL' }} <em v-if="f === 'sph'">*</em></label>
                <div class="num">
                  <button type="button" class="sign" :aria-label="`${e.label}${f === 'sph' ? '球镜' : '柱镜'}切换正负号`" @click="flipSign(draft[e.k], f)">±</button>
                  <input
                    :id="`${e.k}-${f}`" v-model="draft[e.k][f]" type="number" inputmode="decimal" step="0.25"
                    :min="f === 'sph' ? -20 : -6" :max="f === 'sph' ? 20 : 6" class="text" :name="`${e.k}.${f}`"
                    :placeholder="f === 'sph' ? '如 7.00' : '无则空着'" :aria-invalid="!!errors[`${e.k}.${f}`]"
                  />
                </div>
                <small v-if="errors[`${e.k}.${f}`]" class="err">{{ errors[`${e.k}.${f}`] }}</small>
                <small v-else class="pv" :class="{ minus: preview(draft[e.k][f]).startsWith('-') }">{{ preview(draft[e.k][f]) || ' ' }}</small>
              </div>
              <div class="field">
                <label :for="`${e.k}-axis`">轴位 AXIS</label>
                <input
                  :id="`${e.k}-axis`" v-model="draft[e.k].axis" type="number" inputmode="numeric" step="1" min="0" max="180"
                  class="text" :name="`${e.k}.axis`" placeholder="0–180" :aria-invalid="!!errors[`${e.k}.axis`]"
                />
                <small v-if="errors[`${e.k}.axis`]" class="err">{{ errors[`${e.k}.axis`] }}</small>
              </div>
              <div class="field">
                <label :for="`${e.k}-va`">矫正视力</label>
                <input
                  :id="`${e.k}-va`" v-model="draft[e.k].va" type="number" inputmode="decimal" step="any" min="0.05" max="2"
                  class="text" :name="`${e.k}.va`" placeholder="如 0.5，选填" :aria-invalid="!!errors[`${e.k}.va`]"
                />
                <small v-if="errors[`${e.k}.va`]" class="err">{{ errors[`${e.k}.va`] }}</small>
              </div>
            </div>
          </fieldset>
        </div>
        <p class="muted hint">远视是正数（+），散光柱镜常写成负数（−）。手机键盘没有负号时，点 ± 切换。</p>

        <div class="field">
          <span>眼位检查结果</span>
          <div class="seg four">
            <button
              v-for="[k, label] in POSITIONS" :key="k" type="button" :class="{ sel: draft.eyePosition === k }"
              :aria-pressed="draft.eyePosition === k" @click="draft.eyePosition = k"
            >{{ label }}</button>
          </div>
        </div>

        <div class="field">
          <span>这次是否更换眼镜</span>
          <div class="seg">
            <button type="button" :class="{ sel: draft.newGlasses }" :aria-pressed="draft.newGlasses" @click="draft.newGlasses = true">是</button>
            <button type="button" :class="{ sel: !draft.newGlasses }" :aria-pressed="!draft.newGlasses" @click="draft.newGlasses = false">否</button>
          </div>
        </div>

        <label class="field">
          <span>医生建议</span>
          <textarea v-model="draft.advice" rows="3" maxlength="500" placeholder="例如：继续全天戴镜，3 个月后复查" name="advice"></textarea>
        </label>

        <div class="field">
          <label for="next-date">下次复查日期 <em>*</em></label>
          <div class="next">
            <input id="next-date" v-model="draft.nextDate" type="date" class="text" name="nextDate" :aria-invalid="!!errors.nextDate" />
            <button type="button" class="btn ghost" @click="setNext(3)">3 个月后</button>
            <button type="button" class="btn ghost" @click="setNext(6)">6 个月后</button>
          </div>
          <small v-if="errors.nextDate" class="err">{{ errors.nextDate }}</small>
        </div>

        <p v-if="Object.keys(errors).length" class="err big" role="alert">还有 {{ Object.keys(errors).length }} 处需要修改，请看红字提示。</p>
        <div class="row">
          <button type="submit" class="btn primary">保存</button>
          <button type="button" class="btn ghost" @click="closeForm">取消</button>
        </div>
      </form>
    </section>

    <template v-else>
      <!-- 当前处方 -->
      <section class="card current">
        <h2>当前处方</h2>
        <template v-if="current">
          <p class="muted sub">来自 {{ current.date }} 的复查{{ current.hospital ? ` · ${current.hospital}` : '' }}</p>
          <div class="cur-rx">
            <div><span class="eye-l">右眼 OD</span><b>{{ fmtRx(current.od) }}</b><span class="muted">矫正视力 {{ fmtVa(current.od.va) }}</span></div>
            <div><span class="eye-l">左眼 OS</span><b>{{ fmtRx(current.os) }}</b><span class="muted">矫正视力 {{ fmtVa(current.os.va) }}</span></div>
          </div>
          <p v-if="nextInfo" class="next-info" :class="{ overdue: nextInfo.n < 0 }">
            下次复查：<b>{{ nextInfo.date }}</b>（{{ nextInfo.text }}）
          </p>
        </template>
        <p v-else class="muted">还没有复查记录。每次去医院复查后，把验光单上的数字记在这里，方便看变化。</p>
        <button type="button" class="btn primary wide" @click="openForm()">＋ 新增复查记录</button>
      </section>

      <!-- 时间线 -->
      <section v-for="c in cards" :key="c.v.id" class="card visit" :class="{ changed: c.change?.significant }" data-test="visit-card">
        <div class="v-head">
          <span class="date">{{ c.v.date }}</span>
          <span v-if="c.v.hospital" class="muted">{{ c.v.hospital }}</span>
          <span class="badge">{{ c.v.cycloplegic ? '散瞳验光' : '未散瞳' }}</span>
          <span v-if="c.v.newGlasses" class="badge new">更换了眼镜</span>
        </div>

        <div class="rx" role="table" :aria-label="`${c.v.date} 处方`">
          <div class="rx-row head" role="row">
            <span role="columnheader"></span><span role="columnheader">球镜</span><span role="columnheader">柱镜</span>
            <span role="columnheader">轴位</span><span role="columnheader">矫正视力</span>
          </div>
          <div v-for="e in EYES" :key="e.k" class="rx-row" role="row">
            <span role="rowheader" class="eye-l">{{ e.label }}</span>
            <span role="cell" :class="{ chg: c.change && isSignificant(c.change[e.k].sph) }">
              {{ fmtDiopter(c.v[e.k].sph) }}
              <small v-if="c.change && isSignificant(c.change[e.k].sph)">{{ deltaText(c.change[e.k].sph) }}</small>
            </span>
            <span role="cell" :class="{ chg: c.change && isSignificant(c.change[e.k].cyl) }">
              {{ Math.abs(c.v[e.k].cyl) < 1e-9 ? '—' : fmtDiopter(c.v[e.k].cyl) }}
              <small v-if="c.change && isSignificant(c.change[e.k].cyl)">{{ deltaText(c.change[e.k].cyl) }}</small>
            </span>
            <span role="cell">{{ fmtAxis(c.v[e.k]) }}</span>
            <span role="cell">{{ fmtVa(c.v[e.k].va) }}</span>
          </div>
        </div>
        <p v-if="c.change?.significant" class="chg-note">⚠️ 与上次（{{ c.prev!.date }}）相比，度数变化达到 0.50D 或以上</p>

        <dl class="meta">
          <div><dt>眼位</dt><dd :class="{ warn: c.v.eyePosition !== 'normal' }">{{ EYE_POSITION_LABELS[c.v.eyePosition] }}</dd></div>
          <div><dt>下次复查</dt><dd>{{ c.v.nextDate }}</dd></div>
          <div v-if="c.v.advice" class="full"><dt>医生建议</dt><dd>{{ c.v.advice }}</dd></div>
        </dl>

        <div class="actions">
          <button type="button" class="btn ghost" @click="addToCalendar(c.v)">📅 加入日历</button>
          <button type="button" class="btn ghost" @click="openForm(c.v)">编辑</button>
          <button type="button" class="btn danger-text" @click="remove(c.v)">删除</button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.card { margin-bottom: 16px; min-width: 0; }
h2 { font-size: 20px; margin: 0 0 8px; }
.sub { margin: 0 0 10px; font-size: 15px; }
em { color: #a4472a; font-style: normal; }

.btn {
  min-height: 52px; padding: 0 20px; border: none; border-radius: 14px; font: inherit; font-size: 17px; cursor: pointer;
}
.btn.primary { background: var(--primary); color: var(--on-primary); }
.btn.ghost { background: var(--surface-2); color: var(--text); }
.btn.danger-text { background: transparent; color: #a4472a; }
.btn.wide { width: 100%; margin-top: 12px; }
.row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }

/* 当前处方 */
.cur-rx { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
.cur-rx > div { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-radius: 16px; background: var(--bg); }
.cur-rx b { font-size: 22px; font-variant-numeric: tabular-nums; }
.eye-l { font-weight: 700; color: var(--primary-dark); }
.next-info { margin: 12px 0 0; font-size: 17px; }
.next-info.overdue { color: #a4472a; font-weight: 700; }

/* 时间线卡片 */
.visit { border-left: 6px solid var(--line); }
.visit.changed { border-left-color: var(--accent); }
.v-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 10px; }
.date { font-size: 19px; font-weight: 700; }
.badge { padding: 2px 10px; border-radius: 999px; background: var(--surface-2); font-size: 14px; }
.badge.new { background: #d7ece9; }
.rx { display: grid; gap: 4px; font-variant-numeric: tabular-nums; }
.rx-row { display: grid; grid-template-columns: 1.3fr 1fr 1fr 0.8fr 1fr; gap: 4px; align-items: center; }
.rx-row > span { min-width: 0; padding: 8px 4px; border-radius: 10px; text-align: center; font-size: 16px; overflow-wrap: anywhere; }
.rx-row.head > span { padding: 2px 4px; font-size: 13px; color: var(--muted); }
.rx-row .eye-l { text-align: left; font-size: 15px; }
.rx-row > span:not(.eye-l):not([role='columnheader']) { background: var(--bg); }
.rx-row .chg { background: #f6dfb4 !important; font-weight: 700; outline: 2px solid var(--accent); }
.chg small { display: block; font-size: 12px; font-weight: 400; color: #6b4a14; }
.chg-note { margin: 8px 0 0; padding: 8px 12px; border-radius: 12px; background: #f6dfb4; color: #6b4a14; font-size: 15px; }
.meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin: 12px 0 0; }
.meta .full { grid-column: 1 / -1; }
.meta dt { font-size: 14px; color: var(--muted); }
.meta dd { margin: 2px 0 0; font-size: 16px; line-height: 1.5; overflow-wrap: anywhere; white-space: pre-wrap; }
.meta dd.warn { color: #a4472a; font-weight: 700; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }

/* 表单 */
form { display: grid; gap: 16px; }
.grid2 { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); }
.grid2.tight { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 16px; min-width: 0; }
.text, textarea {
  width: 100%; min-width: 0; min-height: 48px; padding: 8px 12px; font: inherit; font-size: 18px;
  border: 2px solid var(--line); border-radius: 12px; background: var(--bg); color: var(--text);
}
.text[aria-invalid='true'] { border-color: #c0704e; }
.eyes { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); }
.eye { margin: 0; padding: 10px 12px 12px; border: 2px solid var(--line); border-radius: 16px; min-width: 0; }
.eye legend { padding: 0 6px; font-weight: 700; color: var(--primary-dark); }
.num { display: flex; gap: 6px; min-width: 0; }
.num .text { flex: 1; }
.sign {
  flex: none; width: 48px; min-height: 48px; border: none; border-radius: 12px; background: var(--surface-2);
  color: var(--text); font: inherit; font-size: 22px; font-weight: 700; cursor: pointer;
}
.pv { font-size: 16px; font-weight: 700; color: var(--primary-dark); font-variant-numeric: tabular-nums; }
.pv.minus { color: #8a3a1f; }
.err { color: #a4472a; font-size: 14px; line-height: 1.4; }
.err.big { margin: 0; font-size: 16px; font-weight: 700; }
.hint { margin: -6px 0 0; font-size: 14px; line-height: 1.5; }
.seg { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-width: 360px; }
.seg.four { grid-template-columns: repeat(4, minmax(0, 1fr)); max-width: 560px; }
.seg button {
  min-height: 48px; border: 2px solid var(--line); border-radius: 12px; background: var(--bg); color: var(--text);
  font: inherit; font-size: 17px; cursor: pointer;
}
.seg button.sel { background: #d7ece9; border-color: var(--primary); font-weight: 700; }
.next { display: flex; flex-wrap: wrap; gap: 8px; }
.next .text { flex: 1 1 180px; }
.next .btn { flex: 1 1 100px; padding: 0 12px; }
</style>
