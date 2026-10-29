<script setup lang="ts">
// DOM 版星星粒子：放在 position:relative 的容器里，(x, y) 为容器内 CSS 像素坐标。父组件在 BURST_MS 后移除它。
defineProps<{ x: number; y: number; r?: number }>()
const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4 + 0.2)
</script>

<template>
  <div class="burst" :style="{ left: `${x}px`, top: `${y}px` }" aria-hidden="true">
    <span
      v-for="(a, i) in rays"
      :key="i"
      class="star"
      :style="{ '--dx': `${Math.cos(a) * (r ?? 60)}px`, '--dy': `${Math.sin(a) * (r ?? 60)}px` }"
    >⭐</span>
  </div>
</template>

<style scoped>
.burst { position: absolute; width: 0; height: 0; pointer-events: none; z-index: 5; }
.star {
  position: absolute; left: -12px; top: -12px; font-size: 22px; line-height: 24px;
  animation: fly 0.8s ease-out both;
}
@keyframes fly {
  from { transform: translate(0, 0) scale(0.6); opacity: 1; }
  to { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; }
}
</style>
