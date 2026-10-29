import { type Rng, randInt, shuffle } from '../../core/random'

export const MAX_LEVEL = 12
export const SECTOR_DEG = 60
export const candidateCount = (lv: number) => Math.min(4, 2 + Math.floor(lv / 4))
/** 候选块之间的旋转差（度） */
export const angleDiff = (lv: number) => Math.max(12, 90 - lv * 7)

/** 角度 = 缺口 / 扇形块中线的朝向（度，0 = 向右，顺时针） */
export interface Trial { gapAngle: number; candidates: number[]; answer: number }

export function makeTrial(lv: number, rng: Rng): Trial {
  const gapAngle = randInt(rng, 0, 7) * 45
  const n = candidateCount(lv), d = angleDiff(lv)
  const offsets = [0, d, -d, 2 * d].slice(0, n)
  const candidates = shuffle(rng, offsets.map(o => (gapAngle + o + 360) % 360))
  return { gapAngle, candidates, answer: candidates.indexOf(gapAngle) }
}

export const isCorrect = (t: Trial, i: number) => i === t.answer
