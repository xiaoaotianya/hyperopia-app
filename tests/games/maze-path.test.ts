import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import { MAX_LEVEL, bends, distToPolyline, makePath, widthArcmin } from '../../src/games/maze-path/logic'

describe('maze-path logic', () => {
  it('首尾点固定，中间点个数 = 弯道数，x 单调递增', () => {
    const rng = createRng(3)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      const pts = makePath(lv, rng)
      expect(pts[0]).toEqual({ x: 0.08, y: 0.5 })
      expect(pts[pts.length - 1]).toEqual({ x: 0.92, y: 0.5 })
      expect(pts.length).toBe(bends(lv) + 2)
      for (let i = 1; i < pts.length; i++) expect(pts[i].x).toBeGreaterThan(pts[i - 1].x)
      pts.forEach(p => { expect(p.y).toBeGreaterThanOrEqual(0.2); expect(p.y).toBeLessThanOrEqual(0.8) })
    }
  })
  it('distToPolyline：线段上为 0，已知点距离正确', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]
    expect(distToPolyline({ x: 5, y: 0 }, pts)).toBeCloseTo(0)
    expect(distToPolyline({ x: 10, y: 4 }, pts)).toBeCloseTo(0)
    expect(distToPolyline({ x: 5, y: 3 }, pts)).toBeCloseTo(3)
    expect(distToPolyline({ x: -3, y: -4 }, pts)).toBeCloseTo(5)
    expect(distToPolyline({ x: 13, y: 14 }, pts)).toBeCloseTo(5)
  })
  it('退化线段（两点重合）不产生 NaN', () => {
    expect(distToPolyline({ x: 3, y: 4 }, [{ x: 0, y: 0 }, { x: 0, y: 0 }])).toBeCloseTo(5)
  })
  it('弯道数随等级增加，路宽随等级变窄', () => {
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(bends(lv)).toBeGreaterThanOrEqual(bends(lv - 1))
      expect(widthArcmin(lv)).toBeLessThan(widthArcmin(lv - 1))
    }
    expect(bends(MAX_LEVEL)).toBeGreaterThan(bends(0))
  })
})
