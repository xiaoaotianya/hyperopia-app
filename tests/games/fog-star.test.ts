import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import { MAX_LEVEL, TIMEOUT_MS, fogAlpha, isHit, makeTrial, starArcmin, starContrast } from '../../src/games/fog-star/logic'

describe('fog-star logic', () => {
  it('位置在归一化范围内', () => {
    const rng = createRng(13)
    for (let i = 0; i < 300; i++) {
      const t = makeTrial(rng)
      expect(t.x).toBeGreaterThanOrEqual(0.1)
      expect(t.x).toBeLessThanOrEqual(0.9)
      expect(t.y).toBeGreaterThanOrEqual(0.15)
      expect(t.y).toBeLessThanOrEqual(0.85)
    }
  })
  it('命中半径判定', () => {
    const t = { x: 0.5, y: 0.5 }
    expect(isHit(t, 200, 100, 400, 200, 40)).toBe(true)
    expect(isHit(t, 230, 100, 400, 200, 40)).toBe(true) // 0.75 * 40 = 30
    expect(isHit(t, 231, 100, 400, 200, 40)).toBe(false)
    // 小目标放宽点击容差
    expect(isHit(t, 231, 100, 400, 200, 10, 32)).toBe(true)
    expect(isHit(t, 233, 100, 400, 200, 10, 32)).toBe(false)
  })
  it('对比度单调递减且下限 0.01，尺寸递减', () => {
    expect(starContrast(0)).toBeCloseTo(0.6)
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(starContrast(lv)).toBeLessThan(starContrast(lv - 1))
      expect(starArcmin(lv)).toBeLessThan(starArcmin(lv - 1))
    }
    expect(starContrast(100)).toBe(0.01)
    expect(starContrast(MAX_LEVEL)).toBeGreaterThanOrEqual(0.01)
    expect(TIMEOUT_MS).toBe(8000)
  })
  it('雾的透明度不超过 0.03，且不压过星星本身的对比度', () => {
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      expect(fogAlpha(lv)).toBeLessThanOrEqual(0.03)
      expect(fogAlpha(lv)).toBeGreaterThan(0)
      expect(fogAlpha(lv)).toBeLessThanOrEqual(starContrast(lv) / 2 + 1e-9)
    }
  })
})
