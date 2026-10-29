<script setup lang="ts">
import { computed } from 'vue'

/** leaves/flowers/fruits 来自 treeState；索引 >= growFrom 的叶子播放一次生长动画 */
const props = withDefaults(defineProps<{ leaves: number; flowers: number; fruits: number; growFrom?: number }>(), {
  growFrom: Infinity,
})

const MAX_LEAVES = 40, MAX_FLOWERS = 8, MAX_FRUITS = 5
const CX = 100, CY = 82, RX = 66, RY = 50
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
const GREENS = ['#5fae6e', '#4f9e63', '#74bb72', '#5aa86a']

/** 树冠内的固定位置：黄金角螺旋，先靠里再向外，分布均匀 */
function spot(i: number, n: number, inset = 0.88) {
  const r = Math.sqrt((i + 0.6) / n) * inset
  const a = i * GOLDEN
  return { x: CX + Math.cos(a) * RX * r, y: CY + Math.sin(a) * RY * r, a }
}

const leafList = computed(() => {
  const n = Math.min(props.leaves, MAX_LEAVES)
  return Array.from({ length: n }, (_, i) => {
    const p = spot(i, MAX_LEAVES)
    const rot = (Math.atan2(p.y - CY - 12, p.x - CX) * 180) / Math.PI
    const isNew = i >= props.growFrom
    return {
      i, x: p.x, y: p.y, rot, fill: GREENS[i % GREENS.length], isNew,
      delay: isNew ? `${Math.min(i - props.growFrom, 10) * 0.18}s` : '0s',
    }
  })
})
const flowerList = computed(() =>
  Array.from({ length: Math.min(props.flowers, MAX_FLOWERS) }, (_, i) => spot(i * 5 + 2, MAX_LEAVES, 0.92)))
const fruitList = computed(() =>
  Array.from({ length: Math.min(props.fruits, MAX_FRUITS) }, (_, i) => spot(i * 7 + 5, MAX_LEAVES, 0.8)))
const PETALS = [0, 72, 144, 216, 288]
</script>

<template>
  <svg class="glasses-tree" viewBox="0 0 200 200" role="img" :aria-label="`戴镜小树：${leaves} 片叶子，${flowers} 朵花，${fruits} 个果子`">
    <!-- 草地 -->
    <ellipse cx="100" cy="186" rx="78" ry="11" fill="#cfe3b8" />
    <template v-if="leaves === 0">
      <!-- 小芽：还没有叶子时也是一棵在等待长大的小苗 -->
      <path d="M100 184 C100 170 101 160 100 150" stroke="#8a6a4a" stroke-width="5" fill="none" stroke-linecap="round" />
      <ellipse cx="88" cy="148" rx="13" ry="7" transform="rotate(-25 88 148)" fill="#74bb72" />
      <ellipse cx="112" cy="146" rx="13" ry="7" transform="rotate(25 112 146)" fill="#5fae6e" />
    </template>
    <template v-else>
      <!-- 树冠底色 -->
      <ellipse :cx="CX" :cy="CY" :rx="RX + 6" :ry="RY + 6" fill="#e3f0d6" />
      <!-- 树干与枝条 -->
      <path d="M93 186 C95 160 96 135 97 110 L103 110 C104 135 105 160 107 186 Z" fill="#9a7552" />
      <path d="M99 128 C88 118 78 108 66 98" stroke="#9a7552" stroke-width="6" fill="none" stroke-linecap="round" />
      <path d="M101 120 C112 108 122 100 136 92" stroke="#9a7552" stroke-width="6" fill="none" stroke-linecap="round" />
      <path d="M100 112 C100 100 101 88 100 74" stroke="#9a7552" stroke-width="5" fill="none" stroke-linecap="round" />
      <!-- 叶子 -->
      <g v-for="l in leafList" :key="l.i" :transform="`translate(${l.x} ${l.y}) rotate(${l.rot})`">
        <g :class="{ grow: l.isNew }" :style="{ animationDelay: l.delay }">
          <path d="M-9 0 Q0 -7 10 0 Q0 7 -9 0 Z" :fill="l.fill" />
          <path d="M-7 0 L8 0" stroke="#3f8452" stroke-width="0.8" opacity="0.5" />
        </g>
      </g>
      <!-- 花：每 7 片叶子一朵 -->
      <g v-for="(f, i) in flowerList" :key="`f${i}`" :transform="`translate(${f.x} ${f.y})`">
        <circle v-for="p in PETALS" :key="p" :cx="Math.cos((p * Math.PI) / 180) * 4.2" :cy="Math.sin((p * Math.PI) / 180) * 4.2" r="3.6" fill="#f4b6c2" />
        <circle r="2.6" fill="#f6d36b" />
      </g>
      <!-- 果子：每 30 片叶子一个 -->
      <g v-for="(f, i) in fruitList" :key="`r${i}`" :transform="`translate(${f.x} ${f.y + 6})`">
        <path d="M0 -7 Q1 -11 4 -12" stroke="#7a5a3a" stroke-width="1.4" fill="none" />
        <circle r="7" fill="#e5735f" />
        <circle cx="-2.4" cy="-2.4" r="2" fill="#fbe0d6" opacity="0.8" />
      </g>
    </template>
  </svg>
</template>

<style scoped>
.glasses-tree { display: block; width: 100%; height: auto; }
.grow {
  transform-box: fill-box; transform-origin: left center;
  animation: grow 0.9s ease-out both;
}
@keyframes grow {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
