import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import {
  MAX_LEVEL, SHAPES, THEMES, contrast, isCorrect, luminance, makeTrial, sizeArcmin,
} from '../../src/games/moon-shapes/logic'

describe('moon-shapes logic', () => {
  it('对比度 0.6 → 0.01，尺寸 200 → ≥60 角分', () => {
    expect(MAX_LEVEL).toBe(18)
    expect(contrast(0)).toBeCloseTo(0.6)
    expect(contrast(MAX_LEVEL)).toBe(0.01)
    expect(sizeArcmin(0)).toBeCloseTo(200)
    expect(sizeArcmin(99)).toBe(60)
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(contrast(lv)).toBeLessThanOrEqual(contrast(lv - 1))
      expect(sizeArcmin(lv)).toBeLessThanOrEqual(sizeArcmin(lv - 1))
      expect(sizeArcmin(lv)).toBeGreaterThanOrEqual(60)
    }
  })
  it('亮度在 128 上下交替，且至少差 1 级', () => {
    const rng = createRng(2)
    const ts = Array.from({ length: 6 }, (_, i) => makeTrial(MAX_LEVEL, rng, i))
    ts.forEach((t, i) => {
      const L = luminance(t)
      if (i % 2 === 0) expect(L).toBeGreaterThan(128); else expect(L).toBeLessThan(128)
      expect(L).toBeGreaterThanOrEqual(0); expect(L).toBeLessThanOrEqual(255)
    })
    expect(luminance(makeTrial(0, rng, 0))).toBe(Math.round(128 * 1.6))
    expect(luminance(makeTrial(0, rng, 1))).toBe(Math.round(128 * 0.4))
  })
  it('选项是 4 个形状的打乱排列，形状分布覆盖全部', () => {
    const rng = createRng(11)
    const seen = new Set<string>(), orders = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const t = makeTrial(5, rng, i)
      expect([...t.options].sort()).toEqual([...SHAPES].sort())
      expect(THEMES).toContain(t.theme)
      seen.add(t.shape); orders.add(t.options.join())
      expect(isCorrect(t, t.shape)).toBe(true)
      expect(isCorrect(t, SHAPES.find(s => s !== t.shape)!)).toBe(false)
    }
    expect(seen.size).toBe(4)
    expect(orders.size).toBeGreaterThan(5)
  })
})
