/**
 * find-bug / puzzle-gap / stripe-balloon / fog-star 共用的 Canvas 小工具：
 * 尺寸跟随容器（ResizeObserver + devicePixelRatio）、按需 rAF 重绘、星星粒子与摇晃反馈、可统一清理的定时器。
 * 所有资源都在 onBeforeUnmount 时释放，游戏组件可随时被卸载/重新挂载。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

export interface StageSize { w: number; h: number; dpr: number }

/** 星星粒子持续时长（ms），短于游戏的反馈停顿 */
export const BURST_MS = 450
/** 答错摇晃：一个完整往返 340ms（≈2.9Hz，低于 3Hz） */
export const SHAKE_MS = 340
/** 判定后到出下一题的停顿 */
export const FEEDBACK_MS = 600

/**
 * 把 canvas 铺满 wrap 容器。draw 用 CSS px 绘制（已做 dpr 缩放）。
 * onResize 在尺寸变化后调用（可在其中重新布局）。
 */
export function useCanvasStage(draw: (g: CanvasRenderingContext2D, s: StageSize, now: number) => void, onResize?: (s: StageSize) => void) {
  const wrap = ref<HTMLElement | null>(null)
  const canvas = ref<HTMLCanvasElement | null>(null)
  const size: StageSize = { w: 0, h: 0, dpr: 1 }
  let g: CanvasRenderingContext2D | null = null
  let ro: ResizeObserver | undefined
  let raf = 0
  let animateUntil = 0
  let continuous = false
  let alive = false

  function measure() {
    const el = wrap.value, cv = canvas.value
    if (!el || !cv) return
    const r = el.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(1, Math.floor(r.width)), h = Math.max(1, Math.floor(r.height))
    if (w === size.w && h === size.h && dpr === size.dpr && g) return
    size.w = w; size.h = h; size.dpr = dpr
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
    cv.style.width = `${w}px`
    cv.style.height = `${h}px`
    try { g = cv.getContext('2d') } catch { g = null }
    onResize?.(size)
    redraw()
  }

  function frame() {
    raf = 0
    if (!alive) return
    const now = performance.now()
    if (g) {
      g.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)
      draw(g, size, now)
    }
    if (continuous || now < animateUntil) raf = requestAnimationFrame(frame)
  }

  /** 请求重绘一帧 */
  function redraw() {
    if (alive && !raf) raf = requestAnimationFrame(frame)
  }
  /** 在接下来 ms 毫秒内持续重绘（反馈动画用） */
  function animateFor(ms: number) {
    animateUntil = Math.max(animateUntil, performance.now() + ms + 32)
    redraw()
  }
  /** 一直重绘（如漂移的雾） */
  function setContinuous(on: boolean) {
    continuous = on
    redraw()
  }
  /** 把 PointerEvent 换算成画布内的 CSS px 坐标 */
  function pointerPos(e: PointerEvent) {
    const r = canvas.value!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  onMounted(() => {
    alive = true
    if (typeof ResizeObserver !== 'undefined' && wrap.value) {
      ro = new ResizeObserver(() => measure())
      ro.observe(wrap.value)
    }
    window.addEventListener('resize', measure)
    measure()
  })
  onBeforeUnmount(() => {
    alive = false
    ro?.disconnect()
    window.removeEventListener('resize', measure)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  })

  return { wrap, canvas, size, redraw, animateFor, setContinuous, pointerPos }
}

/** 组件内的定时器集合，卸载时统一清除 */
export function useTimers() {
  const ids = new Set<number>()
  onBeforeUnmount(() => { ids.forEach(id => clearTimeout(id)); ids.clear() })
  return {
    after(ms: number, fn: () => void) {
      const id = window.setTimeout(() => { ids.delete(id); fn() }, ms)
      ids.add(id)
      return id
    },
    cancel(id: number | undefined) {
      if (id === undefined) return
      clearTimeout(id); ids.delete(id)
    },
  }
}

/** 五角星路径（中心 cx,cy，外半径 r） */
export function starPath(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, inner = 0.45, rot = -Math.PI / 2) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * inner
    const a = rot + (i * Math.PI) / 5
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y)
  }
  g.closePath()
}

/** 答对的星星粒子 + 答错的摇晃 */
export class Fx {
  private bursts: { x: number; y: number; r: number; t0: number }[] = []
  private shakes = new Map<string | number, number>()

  /** 在 (x,y) 放一圈星星；r 为目标半径（粒子从这里向外飞） */
  burst(x: number, y: number, r: number, now = performance.now()) {
    this.bursts.push({ x, y, r: Math.max(12, r), t0: now })
  }
  shake(key: string | number, now = performance.now()) {
    this.shakes.set(key, now)
  }
  /** 目标当前应平移的 x 偏移（CSS px） */
  shakeOffset(key: string | number, now: number, amp = 8): number {
    const t0 = this.shakes.get(key)
    if (t0 === undefined) return 0
    const p = (now - t0) / SHAKE_MS
    if (p >= 1 || p < 0) { if (p >= 1) this.shakes.delete(key); return 0 }
    return amp * Math.sin(2 * Math.PI * p) * (1 - p)
  }
  clear() { this.bursts = []; this.shakes.clear() }

  draw(g: CanvasRenderingContext2D, now: number) {
    this.bursts = this.bursts.filter(b => now - b.t0 < BURST_MS)
    for (const b of this.bursts) {
      const p = Math.min(1, Math.max(0, (now - b.t0) / BURST_MS))
      const ease = 1 - (1 - p) * (1 - p)
      const dist = b.r * 0.8 + ease * (b.r * 0.8 + 36)
      const size = 7 + 5 * (1 - p)
      g.save()
      g.globalAlpha = 1 - p * p
      g.fillStyle = '#f7c948'
      g.strokeStyle = '#c98a12'
      g.lineWidth = 1.5
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + p * 0.6
        starPath(g, b.x + Math.cos(a) * dist, b.y + Math.sin(a) * dist, size, 0.45, a)
        g.fill(); g.stroke()
      }
      g.restore()
    }
  }
}
