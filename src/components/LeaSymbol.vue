<script setup lang="ts">
/**
 * LEA 风格视标（苹果、房子、圆、方），Canvas 绘制。
 * - 视标高度恰好为 cssPx（按 devicePixelRatio 渲染，画布像素对齐）
 * - 笔画宽度 = 视标高的 1/5
 * - crowded：四周加矩形拥挤框，间距 0.5 个视标宽，线宽 = 笔画宽
 * 视力测试需要高对比度，所以固定黑色视标、白色背景。
 */
import { computed, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ symbol: string; cssPx: number; crowded?: boolean }>(), { crowded: false })

const canvas = ref<HTMLCanvasElement | null>(null)
const STROKE = 0.2 // 相对视标高
const GAP = 0.5    // 拥挤框间距（相对视标宽，视标宽 = 高）

const dpr = () => (typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1)

/** 画布总边长（以视标高为单位） */
const extent = computed(() => (props.crowded ? 1 + 2 * (GAP + STROKE) : 1))

// 画布像素取整后再反推 CSS 尺寸，保证视标在设备像素上恰好 cssPx × dpr 高
const layout = computed(() => {
  const r = dpr()
  const hDev = props.cssPx * r
  const sideDev = Math.max(1, Math.ceil(hDev * extent.value))
  return { r, hDev, sideDev, sideCss: sideDev / r }
})

type Ctx = CanvasRenderingContext2D

function drawSymbol(g: Ctx) {
  const sw = STROKE
  g.beginPath()
  switch (props.symbol) {
    case 'circle':
      g.arc(0.5, 0.5, 0.5, 0, Math.PI * 2)
      g.moveTo(1 - sw, 0.5)
      g.arc(0.5, 0.5, 0.5 - sw, 0, Math.PI * 2, true)
      g.fill('evenodd')
      break
    case 'square':
      g.rect(0, 0, 1, 1)
      g.rect(sw, sw, 1 - 2 * sw, 1 - 2 * sw)
      g.fill('evenodd')
      break
    case 'house': {
      // 外轮廓：墙 + 尖顶；内轮廓按笔画宽内缩（斜边按法向距离内缩）
      const eave = 0.45, k = eave / 0.5 // 屋顶斜率
      const dy = sw * Math.sqrt(1 + k * k)
      g.moveTo(0, 1); g.lineTo(1, 1); g.lineTo(1, eave); g.lineTo(0.5, 0); g.lineTo(0, eave); g.closePath()
      const innerY = (x: number) => eave - k * x + dy // 左侧屋顶内缩线
      g.moveTo(sw, 1 - sw); g.lineTo(1 - sw, 1 - sw); g.lineTo(1 - sw, innerY(sw))
      g.lineTo(0.5, innerY(0.5)); g.lineTo(sw, innerY(sw)); g.closePath()
      g.fill('evenodd')
      break
    }
    case 'apple':
    default: {
      // 苹果身体：中心线描边，外缘落在 [0,1] × [~0.17,1]
      const h = sw / 2
      g.lineWidth = sw
      g.lineJoin = 'round'
      g.moveTo(0.5, 0.32)
      g.bezierCurveTo(0.35, 0.18, h, 0.2, h, 0.5)
      g.bezierCurveTo(h, 0.78, 0.28, 1 - h, 0.4, 1 - h)
      g.lineTo(0.6, 1 - h)
      g.bezierCurveTo(0.72, 1 - h, 1 - h, 0.78, 1 - h, 0.5)
      g.bezierCurveTo(1 - h, 0.2, 0.65, 0.18, 0.5, 0.32)
      g.closePath()
      g.stroke()
      // 果柄：顶端圆头恰好到 y=0
      const cap = sw * 0.35
      g.beginPath()
      g.lineWidth = cap * 2
      g.lineCap = 'round'
      g.moveTo(0.5, 0.3); g.lineTo(0.6, cap)
      g.stroke()
      break
    }
  }
}

function draw() {
  const cv = canvas.value
  if (!cv) return
  const { hDev, sideDev } = layout.value
  cv.width = sideDev
  cv.height = sideDev
  let g: Ctx | null = null
  try { g = cv.getContext('2d') } catch { g = null }
  if (!g) return
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, sideDev, sideDev)
  g.fillStyle = '#000000'
  g.strokeStyle = '#000000'
  // 以视标高为 1 个单位，原点放在视标左上角
  const off = (sideDev - hDev) / 2
  g.setTransform(hDev, 0, 0, hDev, off, off)
  if (props.crowded) {
    // 拥挤框：框线内缘离视标 GAP，线宽 STROKE；用两个矩形 evenodd 填充，避免描边抗锯齿偏差
    const a = -GAP - STROKE, b = 1 + GAP + STROKE
    g.beginPath()
    g.rect(a, a, b - a, b - a)
    g.rect(-GAP, -GAP, 1 + 2 * GAP, 1 + 2 * GAP)
    g.fill('evenodd')
  }
  drawSymbol(g)
}

onMounted(draw)
watch(() => [props.symbol, props.cssPx, props.crowded], draw)
</script>

<template>
  <canvas
    ref="canvas"
    class="lea"
    :data-symbol="symbol"
    :style="{ width: `${layout.sideCss}px`, height: `${layout.sideCss}px` }"
    aria-hidden="true"
  />
</template>

<style scoped>
.lea { display: block; background: #fff; flex: none; }
</style>
