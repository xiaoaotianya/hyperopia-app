<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
const props = defineProps<{ sticker: string }>()
const emit = defineEmits<{ close: [] }>()
let timer: number | undefined
onMounted(() => { timer = window.setTimeout(() => emit('close'), 3500) })
onBeforeUnmount(() => clearTimeout(timer))
const stars = Array.from({ length: 8 }, (_, i) => i)
</script>

<template>
  <div class="burst" role="dialog" aria-label="得到贴纸" @click="emit('close')">
    <div class="ring">
      <span v-for="i in stars" :key="i" class="star" :style="{ transform: `rotate(${i * 45}deg) translateY(-120px)` }">⭐</span>
      <div class="sticker">{{ props.sticker }}</div>
    </div>
    <p class="msg">太棒啦！</p>
  </div>
</template>

<style scoped>
.burst {
  position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column;
  align-items: center; justify-content: center; background: rgba(243, 239, 230, 0.94);
}
.ring { position: relative; width: 260px; height: 260px; display: flex; align-items: center; justify-content: center; }
.star { position: absolute; left: calc(50% - 16px); top: calc(50% - 16px); font-size: 32px; animation: fadein 1s ease-out both; }
.sticker { font-size: 140px; animation: pop 0.9s ease-out both; }
.msg { font-size: 36px; font-weight: 700; color: var(--primary-dark); margin: 8px 0 0; }
@keyframes pop { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
</style>
