// 游戏 17–21 共用的小工具：舞台尺寸、Canvas（按 devicePixelRatio 缩放）、rAF 循环、星星粒子、轻晃。
import { onBeforeUnmount, onMounted, reactive, ref, type Ref } from 'vue'

export const SHAKE_MS = 300
export const BURST_MS = 800
/** 触控命中半径下限（px），保证 ≥64px 的触控区域 */
export const MIN_HIT_RADIUS = 32

/** 用 ResizeObserver 跟踪元素的 CSS 像素尺寸 */
export function useStageSize(el: Ref<HTMLElement | null>, onResize?: (w: number, h: number) => void) {
  const size = reactive({ w: 0, h: 0 })
  let ro: ResizeObserver | null = null
  const measure = () => {
    if (!el.value) return
    const r = el.value.getBoundingClientRect()
    const w = Math.round(r.width), h = Math.round(r.height)
    if (w === size.w && h === size.h) return
    size.w = w; size.h = h
    onResize?.(w, h)
  }
  onMounted(() => {
    measure()
    if (typeof ResizeObserver !== 'undefined' && el.value) {
      ro = new ResizeObserver(measure)
      ro.observe(el.value)
    }
  })
  onBeforeUnmount(() => { ro?.disconnect(); ro = null })
  return size
}

export type DrawFn = (g: CanvasRenderingContext2D, w: number, h: number, now: number, dt: number) => void

/**
 * Canvas 铺满容器：按 devicePixelRatio 设置画布像素，绘制时使用 CSS 像素坐标。
 * 每帧调用 draw(g, w, h, now, dt)，dt 单位为秒（上限 0.1s，避免切回后跳帧）。
 */
export function useCanvas(draw: DrawFn, onResize?: (w: number, h: number) => void) {
  const wrap = ref<HTMLDivElement | null>(null)
  const canvas = ref<HTMLCanvasElement | null>(null)
  let g: CanvasRenderingContext2D | null = null
  let dpr = 1
  let raf = 0
  let last = 0
  let alive = false

  const size = useStageSize(wrap, (w, h) => {
    const c = canvas.value
    if (!c) return
    dpr = window.devicePixelRatio || 1
    c.width = Math.max(1, Math.round(w * dpr))
    c.height = Math.max(1, Math.round(h * dpr))
    onResize?.(w, h)
  })

  const loop = (now: number) => {
    if (!alive) return
    const dt = last ? Math.min(0.1, Math.max(0, (now - last) / 1000)) : 0
    last = now
    if (g && size.w > 0 && size.h > 0) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, size.w, size.h)
      draw(g, size.w, size.h, now, dt)
    }
    raf = requestAnimationFrame(loop)
  }

  onMounted(() => {
    try { g = canvas.value?.getContext('2d') ?? null } catch { g = null }
    alive = true
    if (typeof requestAnimationFrame !== 'undefined') raf = requestAnimationFrame(loop)
  })
  onBeforeUnmount(() => {
    alive = false
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf)
  })

  /** 指针事件 → 画布内 CSS 像素坐标 */
  function toLocal(e: PointerEvent | MouseEvent) {
    const r = canvas.value?.getBoundingClientRect()
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
  }

  return { wrap, canvas, size, toLocal }
}

/** 一组定时器，卸载时统一清除 */
export function useTimers() {
  const ids = new Set<number>()
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { ids.delete(id); fn() }, ms)
    ids.add(id)
    return id
  }
  const cancel = (id: number | undefined) => { if (id !== undefined) { clearTimeout(id); ids.delete(id) } }
  const clearAll = () => { ids.forEach(id => clearTimeout(id)); ids.clear() }
  onBeforeUnmount(clearAll)
  return { later, cancel, clearAll }
}

/** 五角星路径 */
export function starPath(g: CanvasRenderingContext2D, x: number, y: number, r: number, inner = 0.45, rot = -Math.PI / 2) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * inner
    const a = rot + (i * Math.PI) / 5
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py)
  }
  g.closePath()
}

/** 轻晃位移：300ms 内向一侧平滑摆动一次再回来（低于 3Hz，不抖动） */
export function shakeOffset(startMs: number, now: number, amp = 8): number {
  if (!startMs) return 0
  const p = (now - startMs) / SHAKE_MS
  if (p < 0 || p >= 1) return 0
  return amp * Math.sin(Math.PI * p)
}

interface Burst { x: number; y: number; t0: number; r: number }

/** 星星粒子：答对时从目标位置向外散开并淡出 */
export class StarBursts {
  private list: Burst[] = []
  add(x: number, y: number, now: number, r = 40) { this.list.push({ x, y, t0: now, r }) }
  clear() { this.list = [] }
  draw(g: CanvasRenderingContext2D, now: number) {
    this.list = this.list.filter(b => now - b.t0 < BURST_MS)
    for (const b of this.list) {
      const p = (now - b.t0) / BURST_MS
      const ease = 1 - (1 - p) * (1 - p)
      g.save()
      g.globalAlpha = 1 - p
      g.fillStyle = '#f2b33d'
      g.strokeStyle = '#d98f1f'
      g.lineWidth = 1.5
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + 0.2
        const d = b.r * 0.4 + b.r * 1.2 * ease
        starPath(g, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 7 + 4 * (1 - p))
        g.fill(); g.stroke()
      }
      g.restore()
    }
  }
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
