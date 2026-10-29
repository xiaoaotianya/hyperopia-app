<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { replaceStore, storage, store } from '../../core/store'
import { defaultData, type AppData } from '../../core/storage'
import { todayKey } from '../../core/date'
import { backupFilename, parseBackup } from '../../core/backup'
import { needsAddToHome } from '../../core/platform'

const AVATARS = ['🐻', '🐰', '🐱', '🐶', '🐼', '🦊', '🐯', '🐸']

const recheck = computed({
  get: () => store.settings.recheckDate ?? '',
  set: (v: string) => { store.settings.recheckDate = v || null },
})
const birthMonth = computed({
  get: () => store.profile.birthMonth ?? '',
  set: (v: string) => { store.profile.birthMonth = /^\d{4}-\d{2}$/.test(v) ? v : null },
})
const thisMonth = todayKey().slice(0, 7)

function recheckIn3Months() {
  const d = new Date()
  d.setMonth(d.getMonth() + 3)
  store.settings.recheckDate = todayKey(d)
}

function exportJson() {
  const today = todayKey()
  store.meta.lastBackupAt = today
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFilename(today)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---- 从备份恢复 ----
const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref('')
const importDone = ref(false)
const pending = ref<{ data: AppData; summary: { days: number; tests: number; visits: number; stickers: number }; name: string } | null>(null)

const readText = (f: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result ?? ''))
  r.onerror = () => reject(r.error)
  r.readAsText(f)
})

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 允许再次选择同一个文件
  importError.value = ''; importDone.value = false; pending.value = null
  if (!file) return
  let text = ''
  try { text = await readText(file) } catch { importError.value = '无法读取这个文件'; return }
  const r = parseBackup(text)
  if (!r.ok) { importError.value = r.error; return }
  pending.value = { data: r.data, summary: r.summary, name: file.name }
}

function confirmImport() {
  if (!pending.value) return
  const data = pending.value.data
  data.meta.persisted = store.meta.persisted // 防清理保护是本设备的状态，不随备份迁移
  replaceStore(data)
  pending.value = null
  importDone.value = true
}

const persistText = computed(() => {
  if (!storage.persistent) return { ok: false, text: '本地存储不可用（可能是无痕模式），关闭页面后记录会丢失' }
  if (store.meta.persisted === true) return { ok: true, text: '已开启防清理保护' }
  if (store.meta.persisted === false) return { ok: false, text: '浏览器未授予防清理保护，建议定期导出备份' }
  return { ok: false, text: '此浏览器不支持防清理保护，建议定期导出备份' }
})
const showA2HS = needsAddToHome()

function clearAll() {
  if (!confirm('确定要清空全部数据吗？训练记录、打卡、贴纸和设置都会被删除，且无法恢复。建议先导出备份。')) return
  storage.clear()
  const fresh = defaultData()
  fresh.meta.persisted = store.meta.persisted // 防清理保护是本设备的状态，清空数据后不变
  replaceStore(fresh)
}
</script>

<template>
  <div class="page">
    <PageHeader title="设置" back="/parent" back-label="‹" />

    <section class="card">
      <h2>孩子</h2>
      <label class="row">
        <span>昵称</span>
        <input v-model.trim="store.profile.nickname" type="text" maxlength="8" class="text" />
      </label>
      <label class="row">
        <span>出生年月</span>
        <input v-model="birthMonth" type="month" class="text" :max="thisMonth" aria-label="出生年月" />
      </label>
      <p class="muted note">用于视力自测按年龄给出参考，只保存在本机。</p>
      <div class="row col">
        <span>头像</span>
        <div class="avatars">
          <button
            v-for="a in AVATARS"
            :key="a"
            type="button"
            class="avatar"
            :class="{ sel: store.profile.avatar === a }"
            :aria-pressed="store.profile.avatar === a"
            @click="store.profile.avatar = a"
          >{{ a }}</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>训练</h2>
      <label class="row col">
        <span>每日时长上限：<b>{{ store.settings.dailyLimitMin }}</b> 分钟</span>
        <input v-model.number="store.settings.dailyLimitMin" type="range" min="5" max="20" step="1" />
      </label>
      <label class="row col">
        <span>观看距离：<b>{{ store.settings.viewingDistanceMm }}</b> 毫米（大约一只小手臂的距离，默认 400）</span>
        <input v-model.number="store.settings.viewingDistanceMm" type="range" min="300" max="500" step="10" />
      </label>
      <label class="row col">
        <span>休息间隔：每 <b>{{ store.settings.breakEveryMin }}</b> 分钟休息 20 秒</span>
        <input v-model.number="store.settings.breakEveryMin" type="range" min="3" max="10" step="1" />
      </label>
    </section>

    <section class="card">
      <h2>复查提醒</h2>
      <div class="row">
        <input v-model="recheck" type="date" class="text" aria-label="复查日期" />
        <button type="button" class="btn" @click="recheckIn3Months">设为 3 个月后</button>
      </div>
      <p class="muted">复查前 14 天会在家长区首页提醒。如果在「复查档案」里填写了下次复查日期，以档案为准。</p>
    </section>

    <section class="card">
      <h2>数据安全</h2>
      <p class="status" :class="{ ok: persistText.ok }">{{ persistText.ok ? '🛡️' : '⚠️' }} {{ persistText.text }}</p>
      <p v-if="store.meta.lastBackupAt" class="muted note">上次导出备份：{{ store.meta.lastBackupAt.slice(0, 10) }}</p>
      <p v-else class="muted note">还没有导出过备份。</p>
      <div v-if="showA2HS" class="a2hs">
        📲 添加到主屏幕可以避免数据被浏览器清理：在 Safari 中点底部的「分享」按钮，选择「添加到主屏幕」，以后从主屏幕图标打开。
      </div>
      <div class="row">
        <button type="button" class="btn" @click="exportJson">导出备份</button>
        <button type="button" class="btn soft" @click="fileInput?.click()">从备份恢复</button>
        <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" aria-label="选择备份文件" @change="onFile" />
      </div>
      <p v-if="importError" class="status err" role="alert">⚠️ {{ importError }}，当前数据没有改动。</p>
      <p v-if="importDone" class="status ok" role="status">✅ 已从备份恢复。</p>
      <div v-if="pending" class="preview" role="dialog" aria-label="确认恢复备份">
        <h3>确认从这个备份恢复？</h3>
        <ul>
          <li>文件：{{ pending.name }}</li>
          <li>备份日期：{{ pending.data.meta.lastBackupAt?.slice(0, 10) ?? '未知' }}</li>
          <li>每日记录 {{ pending.summary.days }} 天 · 视力自测 {{ pending.summary.tests }} 次 · 复查记录 {{ pending.summary.visits }} 条 · 贴纸 {{ pending.summary.stickers }} 张</li>
        </ul>
        <p class="warn">恢复后，本机当前的全部数据会被备份内容替换。</p>
        <div class="row">
          <button type="button" class="btn danger" @click="confirmImport">确认恢复</button>
          <button type="button" class="btn soft" @click="pending = null">取消</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>清空</h2>
      <div class="row">
        <button type="button" class="btn danger" @click="clearAll">清空全部数据</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.card { margin-bottom: 16px; }
h2 { font-size: 18px; margin: 0 0 12px; }
.row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
.row.col { flex-direction: column; align-items: stretch; gap: 8px; }
.row input[type='range'] { width: 100%; height: 32px; accent-color: var(--primary); }
.text {
  min-height: 48px; padding: 0 12px; font-size: 18px; border: 2px solid var(--line); border-radius: 12px;
  background: var(--bg); color: var(--text); min-width: 0;
}
.avatars { display: flex; flex-wrap: wrap; gap: 8px; }
.avatar {
  width: 64px; height: 64px; border: 3px solid transparent; border-radius: 16px; background: var(--bg);
  font-size: 36px; cursor: pointer;
}
.avatar.sel { border-color: var(--primary); }
.btn {
  min-height: 48px; padding: 0 18px; border: none; border-radius: 12px; background: var(--primary);
  color: var(--on-primary); font: inherit; font-size: 17px; cursor: pointer;
}
.btn.danger { background: #c0704e; }
.btn.soft { background: var(--surface-2); color: var(--text); }
.muted { margin: 0; font-size: 14px; }
.note { margin: -6px 0 14px; }
.hidden { display: none; }
.status { margin: 0 0 12px; padding: 10px 14px; border-radius: 12px; background: #f6e6c4; color: #6b4a14; line-height: 1.5; }
.status.ok { background: #d7ece9; color: #24544f; }
.status.err { background: #f6dcd3; color: #6e2a17; }
.a2hs { margin: 0 0 14px; padding: 10px 14px; border-radius: 12px; background: var(--bg); line-height: 1.6; }
.preview { margin-top: 4px; padding: 14px; border: 2px solid var(--line); border-radius: 16px; background: var(--bg); }
.preview h3 { margin: 0 0 8px; font-size: 17px; }
.preview ul { margin: 0 0 8px; padding-left: 20px; line-height: 1.7; }
.preview .warn { margin: 0 0 12px; color: #9a4a2e; font-weight: 700; }
</style>
