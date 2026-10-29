import { type Rng, randInt } from '../../core/random'
import { gaborValue } from '../stripe-balloon/logic'

export const MAX_LEVEL = 20
/** Michelson 对比度：0.8 → 0.02（每级 0.08 log 单位） */
export const contrast = (lv: number) => Math.max(0.02, 0.8 * Math.pow(10, -lv * 0.08))
/** 空间频率轮换（c/deg） */
export const SF_CYCLE = [2, 4, 6]
/** 泡泡直径（角分）= 4° */
export const BUBBLE_ARCMIN = 240
/** Gabor 包络 sigma 相对泡泡直径的比例 */
export const SIGMA_RATIO = 0.6 / 4
/** 从这一级起改成判断左斜/右斜 */
export const OBLIQUE_FROM = 12

export type Orient = 'vertical' | 'horizontal' | 'oblique45' | 'oblique135'
/** 条纹本身的走向角（度，数学坐标：0 = 横，逆时针为正，45 = "/"） */
export const ORIENT_DEG: Record<Orient, number> = { vertical: 90, horizontal: 0, oblique45: 45, oblique135: 135 }

export const THEMES = ['soap', 'tank', 'planet'] as const
export type Theme = (typeof THEMES)[number]

export interface Trial { options: [Orient, Orient]; answer: 0 | 1; contrast: number; sf: number; theme: Theme }

export const optionsFor = (lv: number): [Orient, Orient] =>
  lv >= OBLIQUE_FROM ? ['oblique45', 'oblique135'] : ['vertical', 'horizontal']

export function makeTrial(lv: number, rng: Rng, trialIndex: number): Trial {
  return {
    options: optionsFor(lv),
    answer: rng() < 0.5 ? 0 : 1,
    contrast: contrast(lv),
    sf: SF_CYCLE[trialIndex % SF_CYCLE.length],
    theme: THEMES[randInt(rng, 0, THEMES.length - 1)],
  }
}

export const answerOrient = (t: Trial) => t.options[t.answer]
export const isCorrect = (t: Trial, tapped: 0 | 1) => tapped === t.answer

/**
 * 任意走向的 Gabor 像素亮度 0–255。x,y 为屏幕像素坐标（y 向下），thetaDeg 为条纹走向角。
 * 把坐标投影到条纹法线方向后复用 stripe-balloon 的 gaborValue（包络各向同性）。
 */
export function orientedGabor(x: number, y: number, c: number, pxPerCycle: number, sigmaPx: number, thetaDeg: number): number {
  const t = (thetaDeg * Math.PI) / 180
  const yUp = -y
  const u = -x * Math.sin(t) + yUp * Math.cos(t) // 法线方向（亮度变化方向）
  const v = x * Math.cos(t) + yUp * Math.sin(t)  // 条纹走向
  return gaborValue(u, v, c, pxPerCycle, sigmaPx)
}
