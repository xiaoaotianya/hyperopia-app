<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ParentGate from '../../components/ParentGate.vue'
import PageHeader from '../../components/PageHeader.vue'
import { storage, store } from '../../core/store'
import { todayKey } from '../../core/date'
import { speechAvailable } from '../../core/speech'
import { isParentOk } from '../../core/parentAuth'

const route = useRoute()
const router = useRouter()
const ok = ref(isParentOk())

function onPass() {
  ok.value = true
  const next = typeof route.query.next === 'string' ? route.query.next : ''
  if (next.startsWith('/parent/')) router.replace(next)
}

const DAY_MS = 86400000
const notices = computed(() => {
  const list: string[] = []
  if (store.calibration.pxPerMm === null) list.push('尚未做屏幕校准，图案大小只是粗略估计。请到「屏幕校准」完成校准。')
  if (!storage.persistent) list.push('浏览器不允许本地存储（如无痕模式），本次进度不会保存。')
  if (!speechAvailable()) list.push('此设备不支持语音朗读，游戏将只显示图标提示。')
  const r = store.settings.recheckDate
  if (r) {
    const days = Math.round((new Date(r + 'T00:00:00').getTime() - new Date(todayKey() + 'T00:00:00').getTime()) / DAY_MS)
    if (days < 0) list.push(`已过复查日期（${r}），请尽快带孩子去医院复查。`)
    else if (days <= 7) list.push(days === 0 ? `今天是复查日（${r}）。` : `复查日期临近：还有 ${days} 天（${r}）。`)
  }
  return list
})

const menu = [
  { to: '/parent/checkin', icon: '📅', label: '戴镜打卡' },
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
      <ul v-if="notices.length" class="notices">
        <li v-for="n in notices" :key="n">⚠️ {{ n }}</li>
      </ul>
      <nav class="menu">
        <button v-for="m in menu" :key="m.to" type="button" class="item" @click="router.push(m.to)">
          <span class="icon">{{ m.icon }}</span>
          <span>{{ m.label }}</span>
        </button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
.notices { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 8px; }
.notices li { padding: 12px 16px; border-radius: 16px; background: #f6dfb4; color: #6b4a14; line-height: 1.5; }
.menu { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); }
.item {
  min-height: 72px; display: flex; align-items: center; gap: 12px; padding: 12px 20px;
  border: none; border-radius: 16px; background: var(--surface); color: var(--text);
  font: inherit; font-size: 20px; cursor: pointer; text-align: left;
}
.icon { font-size: 28px; }
</style>
