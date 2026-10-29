<script setup lang="ts">
import PageHeader from '../components/PageHeader.vue'
import { store } from '../core/store'

/** 眼镜小勇士贴纸 '👓🏅7' → 7；普通贴纸 → null */
const badgeDays = (s: string) => { const m = /^👓🏅(\d+)$/.exec(s); return m ? Number(m[1]) : null }
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
      <template v-for="(s, i) in store.stickers" :key="i">
        <div v-if="badgeDays(s) !== null" class="sticker badge" :aria-label="`眼镜小勇士：连续戴镜 ${badgeDays(s)} 天`">
          <span class="medal">🏅</span>
          <span class="tag">👓 {{ badgeDays(s) }}</span>
        </div>
        <div v-else class="sticker">{{ s }}</div>
      </template>
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
.sticker.badge { position: relative; flex-direction: column; gap: 0; background: #f6e6c4; }
.medal { font-size: 48px; line-height: 1.1; }
.tag {
  font-size: 16px; font-weight: 700; color: #6b4a14; background: var(--surface);
  padding: 0 8px; border-radius: 999px; line-height: 1.5;
}
.empty { text-align: center; font-size: 24px; font-weight: 700; }
.big { font-size: 96px; }
</style>
