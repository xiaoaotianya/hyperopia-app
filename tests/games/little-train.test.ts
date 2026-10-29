import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import { MAX_LEVEL, complexity, nextStarDelayMs, speed, starWindowMs, trackPoint } from '../../src/games/little-train/logic'

describe('little-train logic', () => {
  it('轨道闭合：trackPoint(0) 与 trackPoint(1) 重合', () => {
    for (const cx of [1, 2, 3]) {
      const a = trackPoint(0, cx), b = trackPoint(1, cx)
      expect(b.x).toBeCloseTo(a.x, 9)
      expect(b.y).toBeCloseTo(a.y, 9)
    }
  })
  it('坐标都在 0–1 之间', () => {
    for (const cx of [1, 2, 3]) {
      for (let i = 0; i <= 500; i++) {
        const p = trackPoint(i / 500, cx)
        expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(1)
        expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(1)
      }
    }
  })
  it('starWindowMs 不小于 1000；速度递增；复杂度 1–3 不减', () => {
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      expect(starWindowMs(lv)).toBeGreaterThanOrEqual(1000)
      expect([1, 2, 3]).toContain(complexity(lv))
    }
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(speed(lv)).toBeGreaterThan(speed(lv - 1))
      expect(complexity(lv)).toBeGreaterThanOrEqual(complexity(lv - 1))
    }
  })
  it('nextStarDelayMs 在 2000–4000ms', () => {
    const rng = createRng(5)
    for (let i = 0; i < 100; i++) {
      const d = nextStarDelayMs(rng)
      expect(d).toBeGreaterThanOrEqual(2000); expect(d).toBeLessThanOrEqual(4000)
    }
  })
})
