import { type Rng, randInt, shuffle } from '../../core/random'

export const MAX_LEVEL = 18
/** Weber 对比度：0.6 → 0.01 */
export const contrast = (lv: number) => Math.max(0.01, 0.6 * Math.pow(10, -lv * 0.1))
/** 形状尺寸（角分）：200 → 60 */
export const sizeArcmin = (lv: number) => Math.max(60, 200 * Math.pow(0.94, lv))

export const SHAPES = ['circle', 'square', 'heart', 'house'] as const
export type Shape = (typeof SHAPES)[number]
export const THEMES = ['moon', 'owl', 'lantern'] as const
export type Theme = (typeof THEMES)[number]

/** polarity：+1 比背景亮，-1 比背景暗（按题号交替） */
export interface Trial { shape: Shape; options: Shape[]; polarity: 1 | -1; contrast: number; theme: Theme }

export function makeTrial(lv: number, rng: Rng, trialIndex: number): Trial {
  return {
    shape: SHAPES[randInt(rng, 0, SHAPES.length - 1)],
    options: shuffle(rng, [...SHAPES]),
    polarity: trialIndex % 2 === 0 ? 1 : -1,
    contrast: contrast(lv),
    theme: THEMES[randInt(rng, 0, THEMES.length - 1)],
  }
}

/** 形状灰度：128 × (1 ± c)，保证至少与背景差 1 级（8 位屏幕下限） */
export function luminance(t: Trial): number {
  let L = Math.round(128 * (1 + t.polarity * t.contrast))
  if (L === 128) L += t.polarity
  return Math.min(255, Math.max(0, L))
}

export const isCorrect = (t: Trial, tapped: Shape) => tapped === t.shape
