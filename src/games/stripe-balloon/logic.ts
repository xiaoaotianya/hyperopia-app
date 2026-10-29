import { type Rng } from '../../core/random'

export const MAX_LEVEL = 20
/** Michelson 对比度：0.8 → 0.01（每级 0.1 log 单位） */
export const contrast = (lv: number) => Math.max(0.01, 0.8 * Math.pow(10, -lv * 0.1))
/** 空间频率轮换（c/deg） */
export const SF_CYCLE = [2, 4, 6, 8]
/** 气球直径（角分）= 4° */
export const BALLOON_ARCMIN = 240
/** Gabor 包络 sigma 相对气球直径的比例（4° 时为 0.6°） */
export const SIGMA_RATIO = 0.6 / 4

export interface Trial { side: 0 | 1; contrast: number; sf: number }

export function makeTrial(lv: number, rng: Rng, trialIndex: number): Trial {
  return { side: rng() < 0.5 ? 0 : 1, contrast: contrast(lv), sf: SF_CYCLE[trialIndex % SF_CYCLE.length] }
}

/** Gabor 像素亮度 0-255；x,y 为相对中心的像素坐标（与 sfPxCycle、sigmaPx 同一像素单位） */
export function gaborValue(x: number, y: number, c: number, sfPxCycle: number, sigmaPx: number): number {
  const env = Math.exp(-(x * x + y * y) / (2 * sigmaPx * sigmaPx))
  return Math.round(128 + 127 * c * env * Math.cos((2 * Math.PI * x) / sfPxCycle))
}

export const isCorrect = (t: Trial, tapped: 0 | 1) => tapped === t.side
