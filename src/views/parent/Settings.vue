<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { storage, store } from '../../core/store'
import { defaultData } from '../../core/storage'
import { todayKey } from '../../core/date'

const AVATARS = ['🐻', '🐰', '🐱', '🐶', '🐼', '🦊', '🐯', '🐸']

const recheck = computed({
  get: () => store.settings.recheckDate ?? '',
  set: (v: string) => { store.settings.recheckDate = v || null },
})

function recheckIn3Months() {
  const d = new Date()
  d.setMonth(d.getMonth() + 3)
  store.settings.recheckDate = todayKey(d)
}

function exportJson() {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hyperopia-${todayKey()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function clearAll() {
  if (!confirm('确定要清空全部数据吗？训练记录、打卡、贴纸和设置都会被删除，且无法恢复。建议先导出备份。')) return
  storage.clear()
  Object.assign(store, defaultData())
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
      <p class="muted">复查前 7 天会在家长区首页提醒。</p>
    </section>

    <section class="card">
      <h2>数据</h2>
      <div class="row">
        <button type="button" class="btn" @click="exportJson">导出 JSON 备份</button>
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
.muted { margin: 0; font-size: 14px; }
</style>
