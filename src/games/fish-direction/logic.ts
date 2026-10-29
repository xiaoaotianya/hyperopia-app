import { type Rng, randInt, shuffle } from '../../core/random'

export const MAX_LEVEL = 18
/** 目标（头到尾）整体尺寸，角分：50 → 5，每级 ×0.88 */
export const sizeArcmin = (lv: number) => Math.max(5, 50 * Math.pow(0.88, lv))
/** 陪游（拥挤干扰）数量 0 → 4 */
export const flankerCount = (lv: number) => Math.min(4, Math.floor(lv / 3))
/** 中心距 / 尺寸：2.0 → 1.0 */
export const spacingFactor = (lv: number) => Math.max(1.0, 2.0 - lv * 0.07)

export const DIRS = ['up', 'down', 'left', 'right'] as const
export type Dir = (typeof DIRS)[number]
export const THEMES = ['fish', 'bird', 'car'] as const
export type Theme = (typeof THEMES)[number]

/** dx/dy：相对目标的格位（单位 = 中心距） */
export interface Flanker { dx: number; dy: number; dir: Dir }
export interface Trial { dir: Dir; theme: Theme; flankers: Flanker[]; spacing: number }

const H_SLOTS = [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }]
const V_SLOTS = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }]

export function makeTrial(lv: number, rng: Rng): Trial {
  const dir = DIRS[randInt(rng, 0, 3)]
  const n = flankerCount(lv)
  // 先放左右（1 条时随机一侧），再放上下
  const slots = [...shuffle(rng, H_SLOTS), ...shuffle(rng, V_SLOTS)].slice(0, n)
  const flankers = slots.map(s => ({ ...s, dir: DIRS[randInt(rng, 0, 3)] }))
  return { dir, theme: THEMES[randInt(rng, 0, THEMES.length - 1)], flankers, spacing: spacingFactor(lv) }
}

export const isCorrect = (t: Trial, tapped: Dir) => tapped === t.dir
