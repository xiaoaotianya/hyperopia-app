<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Alert } from '../core/alerts'

defineProps<{ alerts: Alert[] }>()
const router = useRouter()
const ICON = { red: '❗', yellow: '⚠️', gray: 'ℹ️' } as const
const LEVEL_TEXT = { red: '重要', yellow: '留意', gray: '提示' } as const
</script>

<template>
  <section class="alert-list" aria-label="提醒">
    <p v-if="!alerts.length" class="empty">✅ 目前没有需要处理的事项</p>
    <ul v-else>
      <li v-for="a in alerts" :key="a.id" class="alert" :class="a.level" :data-alert="a.id">
        <span class="icon" aria-hidden="true">{{ ICON[a.level] }}</span>
        <span class="text"><span class="sr">{{ LEVEL_TEXT[a.level] }}：</span>{{ a.text }}</span>
        <button type="button" class="go" @click="router.push(a.to)">去处理 ›</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.alert {
  display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 14px; border-radius: 16px;
  border-left: 6px solid; line-height: 1.5; font-size: 16px;
}
.alert.red { background: #f6dcd3; border-color: #c0573a; color: #6e2a17; }
.alert.yellow { background: #f6e6c4; border-color: #d99a2b; color: #6b4a14; }
.alert.gray { background: var(--surface); border-color: var(--line); color: var(--muted); }
.icon { flex: none; font-size: 20px; }
.text { flex: 1; min-width: 0; }
.go {
  flex: none; min-height: 48px; padding: 0 14px; border: none; border-radius: 12px;
  background: rgba(255, 255, 255, 0.6); color: inherit; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer;
}
.empty { margin: 0; padding: 12px 16px; border-radius: 16px; background: var(--surface); color: var(--muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
