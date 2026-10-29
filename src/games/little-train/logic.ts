import { type Rng } from '../../core/random'

export const MAX_LEVEL = 12
export const speed = (lv: number) => 0.05 + lv * 0.012                 // 轨道周长/秒
export const complexity = (lv: number) => (lv >= 8 ? 3 : lv >= 4 ? 2 : 1)
export const starWindowMs = (lv: number) => Math.max(1000, 2200 - lv * 90)
/** 闭合轨道：t∈[0,1)，返回归一化坐标 0-1 */
export function trackPoint(t: number, cx: number): { x: number; y: number } {
  const a = 2 * Math.PI * t
  return { x: 0.5 + 0.4 * Math.sin(a), y: 0.5 + 0.35 * Math.sin(cx * a + (cx > 1 ? Math.PI / 4 : Math.PI / 2)) }
}
export const nextStarDelayMs = (rng: Rng) => 2000 + rng() * 2000
