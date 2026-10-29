import { type Rng, randInt } from '../../core/random'

export const MAX_LEVEL = 14
export const holeCount = (lv: number) => Math.min(8, 3 + Math.floor(lv / 3))
export const upMs = (lv: number) => Math.max(900, 2500 - lv * 120)
export const hatArcmin = (lv: number) => 40 * Math.pow(0.92, lv)
export interface Pop { hole: number; hasHat: boolean }
export const makePop = (lv: number, rng: Rng): Pop => ({ hole: randInt(rng, 0, holeCount(lv) - 1), hasHat: rng() < 0.6 })
/** 返回 null 表示不计入判定 */
export function judge(p: Pop, action: 'tap' | 'timeout'): boolean | null {
  if (action === 'tap') return p.hasHat
  return p.hasHat ? false : null
}
