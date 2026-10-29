import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import { MAX_LEVEL, hatArcmin, holeCount, judge, makePop, upMs } from '../../src/games/whack-mole/logic'

describe('whack-mole logic', () => {
  it('judge 四种组合', () => {
    expect(judge({ hole: 0, hasHat: true }, 'tap')).toBe(true)
    expect(judge({ hole: 0, hasHat: false }, 'tap')).toBe(false)
    expect(judge({ hole: 0, hasHat: true }, 'timeout')).toBe(false)
    expect(judge({ hole: 0, hasHat: false }, 'timeout')).toBeNull()
  })
  it('hole 在范围内，两种地鼠都会出现', () => {
    const rng = createRng(9)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      let hats = 0
      for (let k = 0; k < 100; k++) {
        const p = makePop(lv, rng)
        expect(Number.isInteger(p.hole)).toBe(true)
        expect(p.hole).toBeGreaterThanOrEqual(0)
        expect(p.hole).toBeLessThan(holeCount(lv))
        if (p.hasHat) hats++
      }
      expect(hats).toBeGreaterThan(0); expect(hats).toBeLessThan(100)
    }
  })
  it('洞数不减且不超过 8，冒头时长不小于 900，帽子随等级变小', () => {
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(holeCount(lv)).toBeGreaterThanOrEqual(holeCount(lv - 1))
      expect(upMs(lv)).toBeLessThanOrEqual(upMs(lv - 1))
      expect(hatArcmin(lv)).toBeLessThan(hatArcmin(lv - 1))
    }
    expect(holeCount(MAX_LEVEL)).toBeLessThanOrEqual(8)
    expect(upMs(MAX_LEVEL)).toBeGreaterThanOrEqual(900)
  })
})
