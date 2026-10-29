import { type Rng } from '../../core/random'

export const MAX_LEVEL = 16
/** 星星的 Weber 对比度：亮度 = 128 × (1 + c) */
export const starContrast = (lv: number) => Math.max(0.01, 0.6 * Math.pow(10, -lv * 0.1))
export const starArcmin = (lv: number) => 120 * Math.pow(0.95, lv)
export const TIMEOUT_MS = 8000
/**
 * 雾块的透明度：最大 0.03，但不超过星星对比度的一半。
 * 否则在高等级时雾本身（约 ±3%）比星星（约 1–2%）还显眼，星星会被雾淹没、无法分辨。
 */
export const fogAlpha = (lv: number) => Math.min(0.03, starContrast(lv) / 2)

/** 0.1–0.9 / 0.15–0.85 的归一化位置 */
export interface Trial { x: number; y: number }

export const makeTrial = (rng: Rng): Trial => ({ x: 0.1 + rng() * 0.8, y: 0.15 + rng() * 0.7 })

/** minRadiusPx：最小命中半径，小星星时放宽点击容差（视觉难度在“看见”，不在点得准） */
export function isHit(t: Trial, px: number, py: number, w: number, h: number, sizePx: number, minRadiusPx = 0) {
  return Math.hypot(px - t.x * w, py - t.y * h) <= Math.max(sizePx * 0.75, minRadiusPx)
}
