import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import { MAX_LEVEL, SF_CYCLE, contrast, gaborValue, isCorrect, makeTrial } from '../../src/games/stripe-balloon/logic'

describe('stripe-balloon logic', () => {
  it('对比度 0.8 → 0.01，单调递减', () => {
    expect(contrast(0)).toBeCloseTo(0.8)
    expect(contrast(MAX_LEVEL)).toBeCloseTo(0.01)
    for (let lv = 1; lv <= MAX_LEVEL; lv++) expect(contrast(lv)).toBeLessThan(contrast(lv - 1))
    expect(contrast(MAX_LEVEL + 5)).toBeCloseTo(0.01)
  })
  it('gaborValue 中心为 128+127c，远处趋近 128，范围 0–255', () => {
    expect(gaborValue(0, 0, 0.8, 10, 20)).toBe(Math.round(128 + 127 * 0.8))
    expect(gaborValue(0, 0, 0.01, 10, 20)).toBe(Math.round(128 + 1.27))
    expect(gaborValue(500, 0, 0.8, 10, 20)).toBe(128)
    expect(gaborValue(0, 500, 0.8, 10, 20)).toBe(128)
    for (let x = -40; x <= 40; x += 3) {
      const v = gaborValue(x, x / 2, 1, 7, 15)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(255)
    }
  })
  it('空间频率按轮次轮换，side 只取 0/1', () => {
    const rng = createRng(9)
    const sfs = Array.from({ length: 8 }, (_, i) => makeTrial(5, rng, i).sf)
    expect(sfs).toEqual([...SF_CYCLE, ...SF_CYCLE])
    SF_CYCLE.forEach(sf => { expect(sf).toBeGreaterThanOrEqual(2); expect(sf).toBeLessThanOrEqual(8) })
    const sides = new Set(Array.from({ length: 50 }, (_, i) => makeTrial(3, rng, i).side))
    expect([...sides].sort()).toEqual([0, 1])
    const t = makeTrial(3, rng, 0)
    expect(t.contrast).toBe(contrast(3))
    expect(isCorrect(t, t.side)).toBe(true)
    expect(isCorrect(t, t.side === 0 ? 1 : 0)).toBe(false)
  })
})
