<script setup lang="ts">
import PageHeader from '../components/PageHeader.vue'
import { store } from '../core/store'
</script>

<template>
  <div class="page">
    <PageHeader title="我的贴纸">
      <span class="count">{{ store.stickers.length }}</span>
    </PageHeader>
    <div v-if="store.stickers.length === 0" class="empty card">
      <div class="big">📒</div>
      <p>玩完一个游戏，就能得到一张贴纸哦</p>
    </div>
    <div v-else class="wall">
      <div v-for="(s, i) in store.stickers" :key="i" class="sticker">{{ s }}</div>
    </div>
  </div>
</template>

<style scoped>
.count { font-size: 24px; font-weight: 700; color: var(--primary-dark); }
.wall { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); }
.sticker {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 56px;
  background: var(--surface); border-radius: var(--radius); box-shadow: 0 4px 0 var(--surface-2);
}
.empty { text-align: center; font-size: 24px; font-weight: 700; }
.big { font-size: 96px; }
</style>
