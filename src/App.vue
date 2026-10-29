<script setup lang="ts">
import { ref } from 'vue'
import { storage } from './core/store'
import { needsAddToHome } from './core/platform'

const persistent = storage.persistent
const A2HS_KEY = 'hyperopia.a2hsHintSeen'
const seen = (() => { try { return localStorage.getItem(A2HS_KEY) === '1' } catch { return false } })()
const showA2HS = ref(!seen && needsAddToHome())
function dismissA2HS() {
  showA2HS.value = false
  try { localStorage.setItem(A2HS_KEY, '1') } catch { /* 忽略 */ }
}
</script>

<template>
  <div class="app">
    <div v-if="!persistent" class="warn">⚠️ 本次进度不会保存（浏览器不允许本地存储）</div>
    <div v-else-if="showA2HS" class="warn a2hs">
      <span>📲 家长：添加到主屏幕可以避免数据被浏览器清理（Safari「分享」→「添加到主屏幕」）</span>
      <button type="button" aria-label="知道了" @click="dismissA2HS">知道了</button>
    </div>
    <div class="app-main"><router-view /></div>
  </div>
</template>

<style scoped>
.app { height: 100vh; height: 100dvh; display: flex; flex-direction: column; }
.warn { flex: none; padding: 6px 16px; background: #f6dfb4; color: #6b4a14; font-size: 14px; text-align: center; }
.a2hs { display: flex; align-items: center; justify-content: center; gap: 12px; text-align: left; }
.a2hs button {
  flex: none; min-height: 44px; padding: 0 14px; border: none; border-radius: 12px;
  background: rgba(255, 255, 255, 0.6); color: inherit; font: inherit; font-size: 14px; cursor: pointer;
}
.app-main { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; }
</style>
