import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import { MAX_LEVEL, dwellMs, eccentricity, makeTrial, position, sizeArcmin } from '../../src/games/chase-butterfly/logic'

describe('chase-butterfly logic', () => {
  it('position 始终在画布范围内', () => {
    const rng = createRng(11)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      for (let k = 0; k < 50; k++) {
        const t = makeTrial(lv, rng)
        expect(t.radius).toBeGreaterThan(0)
        expect(t.radius).toBeLessThanOrEqual(1)
        for (const [w, h] of [[800, 500], [360, 600], [1024, 768]]) {
          const p = position(t, w, h)
          expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(w)
          expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(h)
        }
      }
    }
  })
  it('dwellMs 不小于 900 且不增，eccentricity 随等级增大，尺寸递减', () => {
    for (let lv = 0; lv <= MAX_LEVEL; lv++) expect(dwellMs(lv)).toBeGreaterThanOrEqual(900)
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(dwellMs(lv)).toBeLessThanOrEqual(dwellMs(lv - 1))
      expect(eccentricity(lv)).toBeGreaterThan(eccentricity(lv - 1))
      expect(sizeArcmin(lv)).toBeLessThan(sizeArcmin(lv - 1))
    }
    expect(eccentricity(MAX_LEVEL)).toBeLessThanOrEqual(1)
  })
})
