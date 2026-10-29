<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { store } from '../../core/store'
import { CARD_WIDTH_MM, DEFAULT_PX_PER_MM, pxPerMmFromCard } from '../../core/calibration'

const CARD_HEIGHT_MM = 53.98
type Side = 'long' | 'short'
// 手机竖屏放不下银行卡长边时，可以用短边来量
const side = ref<Side>('long')
const sideMm = computed(() => (side.value === 'long' ? CARD_WIDTH_MM : CARD_HEIGHT_MM))

const ppm = store.calibration.pxPerMm ?? DEFAULT_PX_PER_MM
const width = ref(Math.round(ppm * CARD_WIDTH_MM))
const area = ref<HTMLElement | null>(null)
const maxW = ref(1200)
const saved = ref(false)
const MIN_W = 80

function clamp(v: number) { return Math.min(maxW.value, Math.max(MIN_W, v)) }

function measure() {
  if (area.value) maxW.value = Math.max(MIN_W, Math.floor(area.value.clientWidth) - 20)
  width.value = clamp(width.value)
}
let ro: ResizeObserver | undefined
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && area.value) { ro = new ResizeObserver(measure); ro.observe(area.value) }
})
onBeforeUnmount(() => ro?.disconnect())

function setSide(s: Side) {
  if (s === side.value) return
  const cur = width.value / sideMm.value
  side.value = s
  width.value = clamp(Math.round(cur * sideMm.value))
  saved.value = false
}

// 拖动矩形右边缘调宽
let dragStartX = 0
let dragStartW = 0
function onDown(e: PointerEvent) {
  dragStartX = e.clientX
  dragStartW = width.value
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId)) return
  width.value = clamp(dragStartW + e.clientX - dragStartX)
  saved.value = false
}
function nudge(d: number) { width.value = clamp(width.value + d); saved.value = false }

const resultPpm = computed(() => pxPerMmFromCard((width.value * CARD_WIDTH_MM) / sideMm.value))
function save() {
  store.calibration.pxPerMm = resultPpm.value
  saved.value = true
}
</script>

<template>
  <div class="page">
    <PageHeader title="屏幕校准" back="/parent" back-label="‹" />
    <p class="tip">把一张银行卡贴在屏幕上，拖动矩形右边缘或滑块，调到和卡片一样宽。</p>
    <div class="sides">
      <button type="button" :class="{ sel: side === 'long' }" @click="setSide('long')">量长边（85.6 毫米）</button>
      <button type="button" :class="{ sel: side === 'short' }" @click="setSide('short')">量短边（54 毫米，适合手机竖屏）</button>
    </div>

    <div ref="area" class="area">
      <div class="rect" :style="{ width: `${width}px`, height: `${Math.round((width * (side === 'long' ? CARD_HEIGHT_MM : CARD_WIDTH_MM)) / sideMm)}px` }">
        <span class="label">💳</span>
        <div class="handle" aria-label="拖动调宽" @pointerdown="onDown" @pointermove="onMove" />
      </div>
    </div>

    <div class="controls">
      <button type="button" class="nudge" aria-label="变窄" @click="nudge(-1)">−</button>
      <input v-model.number="width" type="range" :min="MIN_W" :max="maxW" step="1" aria-label="矩形宽度" @input="saved = false" />
      <button type="button" class="nudge" aria-label="变宽" @click="nudge(1)">＋</button>
    </div>
    <p class="muted">当前宽度 {{ width }} 像素 · 约 {{ resultPpm.toFixed(2) }} 像素/毫米</p>
    <p v-if="store.calibration.pxPerMm === null" class="muted">尚未校准，目前按默认值 {{ DEFAULT_PX_PER_MM.toFixed(2) }} 像素/毫米估算。</p>
    <button type="button" class="save" @click="save">{{ saved ? '已保存 ✓' : '保存校准' }}</button>
  </div>
</template>

<style scoped>
.tip { font-size: 18px; line-height: 1.6; margin: 0 0 12px; }
.sides { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.sides button {
  min-height: 48px; padding: 0 14px; border: 2px solid var(--line); border-radius: 12px;
  background: var(--surface); color: var(--text); font: inherit; font-size: 15px; cursor: pointer;
}
.sides button.sel { border-color: var(--primary); background: #d7ece9; }
.area { width: 100%; overflow: hidden; padding: 8px 20px 8px 0; }
.rect {
  position: relative; border-radius: 3.18mm; background: linear-gradient(135deg, #7fb7c9, #4aa3a2);
  display: flex; align-items: center; justify-content: center; touch-action: none;
}
.label { font-size: 40px; }
.handle {
  position: absolute; right: -16px; top: 50%; width: 32px; height: 64px; margin-top: -32px;
  border-radius: 12px; background: var(--accent); cursor: ew-resize; touch-action: none;
}
.controls { display: flex; align-items: center; gap: 12px; margin: 16px 0 8px; }
.controls input { flex: 1; min-width: 0; height: 32px; accent-color: var(--primary); }
.nudge {
  width: 56px; height: 56px; border: none; border-radius: 16px; background: var(--surface);
  font-size: 28px; color: var(--text); cursor: pointer;
}
.muted { font-size: 14px; margin: 4px 0; }
.save {
  margin-top: 12px; min-height: 56px; padding: 0 28px; border: none; border-radius: 16px;
  background: var(--primary); color: var(--on-primary); font: inherit; font-size: 20px; font-weight: 700; cursor: pointer;
}
</style>
