import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import { MAX_LEVEL, angleDiff, candidateCount, isCorrect, makeTrial } from '../../src/games/puzzle-gap/logic'

describe('puzzle-gap logic', () => {
  it('候选里恰好一个等于 gapAngle，answer 指向它，候选互不相同', () => {
    const rng = createRng(5)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      for (let k = 0; k < 30; k++) {
        const t = makeTrial(lv, rng)
        expect(t.candidates).toHaveLength(candidateCount(lv))
        expect(t.candidates.filter(c => c === t.gapAngle)).toHaveLength(1)
        expect(t.candidates[t.answer]).toBe(t.gapAngle)
        expect(new Set(t.candidates).size).toBe(t.candidates.length)
        t.candidates.forEach(c => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(360) })
        expect(isCorrect(t, t.answer)).toBe(true)
        expect(isCorrect(t, (t.answer + 1) % t.candidates.length)).toBe(false)
      }
    }
  })
  it('候选数随等级增加，angleDiff 递减且不小于 12', () => {
    expect(candidateCount(0)).toBe(2)
    expect(candidateCount(MAX_LEVEL)).toBe(4)
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(candidateCount(lv)).toBeGreaterThanOrEqual(candidateCount(lv - 1))
      expect(angleDiff(lv)).toBeLessThanOrEqual(angleDiff(lv - 1))
    }
    for (let lv = 0; lv <= MAX_LEVEL + 5; lv++) expect(angleDiff(lv)).toBeGreaterThanOrEqual(12)
  })
})
