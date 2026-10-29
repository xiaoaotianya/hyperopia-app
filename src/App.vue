<script setup lang="ts">
import { storage } from './core/store'
const persistent = storage.persistent
</script>

<template>
  <div class="app">
    <div v-if="!persistent" class="warn">⚠️ 本次进度不会保存（浏览器不允许本地存储）</div>
    <div class="app-main"><router-view /></div>
  </div>
</template>

<style scoped>
.app { height: 100vh; height: 100dvh; display: flex; flex-direction: column; }
.warn { flex: none; padding: 6px 16px; background: #f6dfb4; color: #6b4a14; font-size: 14px; text-align: center; }
.app-main { flex: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; }
</style>
