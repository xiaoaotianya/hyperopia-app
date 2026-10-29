import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import { MAX_LEVEL, itemCount, isCorrect, makeTrial, sizeArcmin, spacingFactor } from '../../src/games/find-bug/logic'

describe('find-bug logic', () => {
  it('只有一只瓢虫斑点数不同，oddIndex 指向它', () => {
    const rng = createRng(7)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      for (let k = 0; k < 30; k++) {
        const t = makeTrial(lv, rng)
        expect(t.count).toBe(itemCount(lv))
        expect(t.spots).toHaveLength(t.count)
        const others = t.spots.filter((_, i) => i !== t.oddIndex)
        expect(new Set(others).size).toBe(1)
        expect(t.spots[t.oddIndex]).not.toBe(others[0])
        t.spots.forEach(s => expect(s).toBeGreaterThanOrEqual(1))
        expect(isCorrect(t, t.oddIndex)).toBe(true)
        expect(isCorrect(t, (t.oddIndex + 1) % t.count)).toBe(false)
      }
    }
  })
  it('尺寸随等级递减，数量不减，间距不增', () => {
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(sizeArcmin(lv)).toBeLessThan(sizeArcmin(lv - 1))
      expect(itemCount(lv)).toBeGreaterThanOrEqual(itemCount(lv - 1))
      expect(spacingFactor(lv)).toBeLessThanOrEqual(spacingFactor(lv - 1))
    }
    expect(sizeArcmin(0)).toBe(60)
    expect(itemCount(MAX_LEVEL)).toBeLessThanOrEqual(12)
    expect(spacingFactor(MAX_LEVEL)).toBeGreaterThanOrEqual(1.3)
  })
})
