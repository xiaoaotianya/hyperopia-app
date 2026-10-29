import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import {
  DIRS, MAX_LEVEL, THEMES, flankerCount, isCorrect, makeTrial, sizeArcmin, spacingFactor,
} from '../../src/games/fish-direction/logic'

describe('fish-direction logic', () => {
  it('尺寸 50 → 5 角分，每级 ×0.88，下限 5', () => {
    expect(sizeArcmin(0)).toBeCloseTo(50)
    expect(sizeArcmin(1)).toBeCloseTo(44)
    for (let lv = 1; lv <= MAX_LEVEL; lv++) expect(sizeArcmin(lv)).toBeLessThanOrEqual(sizeArcmin(lv - 1))
    expect(sizeArcmin(MAX_LEVEL)).toBeGreaterThanOrEqual(5)
    expect(sizeArcmin(MAX_LEVEL)).toBeLessThan(5.5)
    expect(sizeArcmin(99)).toBe(5)
  })
  it('陪游数量 0 → 4、间距 2.0 → 1.0 倍，均单调', () => {
    expect(flankerCount(0)).toBe(0)
    expect(flankerCount(2)).toBe(0)
    expect(flankerCount(3)).toBe(1)
    expect(flankerCount(MAX_LEVEL)).toBe(4)
    expect(spacingFactor(0)).toBeCloseTo(2.0)
    expect(spacingFactor(99)).toBe(1.0)
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(flankerCount(lv)).toBeGreaterThanOrEqual(flankerCount(lv - 1))
      expect(spacingFactor(lv)).toBeLessThanOrEqual(spacingFactor(lv - 1))
      expect(spacingFactor(lv)).toBeGreaterThanOrEqual(1.0)
    }
  })
  it('方向分布均匀，四个方向都出现', () => {
    const rng = createRng(5)
    const counts: Record<string, number> = {}
    for (let i = 0; i < 2000; i++) { const t = makeTrial(4, rng); counts[t.dir] = (counts[t.dir] ?? 0) + 1 }
    expect(Object.keys(counts).sort()).toEqual([...DIRS].sort())
    for (const d of DIRS) { expect(counts[d]).toBeGreaterThan(400); expect(counts[d]).toBeLessThan(600) }
  })
  it('陪游的数量、位置与间距', () => {
    const rng = createRng(7)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      const t = makeTrial(lv, rng)
      expect(t.flankers.length).toBe(flankerCount(lv))
      expect(t.spacing).toBeCloseTo(spacingFactor(lv))
      expect(THEMES).toContain(t.theme)
      const slots = new Set(t.flankers.map(f => `${f.dx},${f.dy}`))
      expect(slots.size).toBe(t.flankers.length) // 不重叠
      for (const f of t.flankers) {
        expect(Math.abs(f.dx) + Math.abs(f.dy)).toBe(1) // 上下左右相邻一格
        expect(DIRS).toContain(f.dir)
      }
    }
    // 只有 1–2 条时放在左右两侧（水平方向）
    const t2 = makeTrial(6, rng)
    expect(t2.flankers.length).toBe(2)
    expect(t2.flankers.every(f => f.dy === 0)).toBe(true)
  })
  it('isCorrect', () => {
    const t = makeTrial(3, createRng(1))
    expect(isCorrect(t, t.dir)).toBe(true)
    for (const d of DIRS) if (d !== t.dir) expect(isCorrect(t, d)).toBe(false)
  })
})
