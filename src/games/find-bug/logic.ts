import { type Rng, randInt } from '../../core/random'

export const MAX_LEVEL = 14
/** 瓢虫整体尺寸（角分） */
export const sizeArcmin = (lv: number) => 60 * Math.pow(0.86, lv)
export const itemCount = (lv: number) => Math.min(12, 4 + Math.floor(lv / 2))
/** 中心距 / 尺寸 */
export const spacingFactor = (lv: number) => Math.max(1.3, 2.6 - lv * 0.1)

/** spots：每只瓢虫的斑点数 */
export interface Trial { count: number; oddIndex: number; spots: number[] }

export function makeTrial(lv: number, rng: Rng): Trial {
  const count = itemCount(lv)
  const base = randInt(rng, 2, 4)
  const odd = base + (rng() < 0.5 ? -1 : 1)
  const oddIndex = randInt(rng, 0, count - 1)
  const spots = Array.from({ length: count }, (_, i) => (i === oddIndex ? odd : base))
  return { count, oddIndex, spots }
}

export const isCorrect = (t: Trial, tapped: number) => tapped === t.oddIndex
