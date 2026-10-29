import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import {
  KINDS, MAX_LEVEL, THEMES, TIMEOUT_MS, isCorrect, itemArcmin, itemCount, makeTrial, scatter, similarity, type Item,
} from '../../src/games/torch-search/logic'

describe('torch-search logic', () => {
  it('数量 6 → 30、尺寸 120 → 30 角分', () => {
    expect(itemCount(0)).toBe(6)
    expect(itemCount(5)).toBe(16)
    expect(itemCount(99)).toBe(30)
    expect(itemArcmin(0)).toBeCloseTo(120)
    expect(itemArcmin(99)).toBe(30)
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(itemCount(lv)).toBeGreaterThanOrEqual(itemCount(lv - 1))
      expect(itemArcmin(lv)).toBeLessThanOrEqual(itemArcmin(lv - 1))
    }
    expect(TIMEOUT_MS).toBe(15000)
  })
  it('相似度分段', () => {
    expect(similarity(0)).toBe('shape')
    expect(similarity(4)).toBe('shape')
    expect(similarity(5)).toBe('color')
    expect(similarity(9)).toBe('color')
    expect(similarity(10)).toBe('near')
  })
  it('每个主题 3 种物件', () => {
    for (const th of THEMES) expect(KINDS[th].length).toBe(3)
  })
  it('干扰物按等级越来越像，目标唯一', () => {
    const rng = createRng(4)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      for (let k = 0; k < 20; k++) {
        const t = makeTrial(lv, rng)
        expect(t.items.length).toBe(itemCount(lv))
        const tg = t.items[t.targetIndex]
        expect(tg).toEqual(t.target)
        expect(KINDS[t.theme]).toContain(t.target.kind)
        const same = (a: Item) => a.kind === tg.kind && a.variant === tg.variant && a.color === tg.color
        expect(t.items.filter(same).length).toBe(1)
        const s = similarity(lv)
        t.items.forEach((it, i) => {
          if (i === t.targetIndex) return
          expect(KINDS[t.theme]).toContain(it.kind)
          if (s === 'shape') expect(it.kind).not.toBe(tg.kind)
          if (s === 'color') { expect(it.kind).toBe(tg.kind); expect(it.variant).toBe(tg.variant); expect(it.color).not.toBe(tg.color) }
          if (s === 'near') { expect(it.kind).toBe(tg.kind); expect(it.color).toBe(tg.color); expect(it.variant).not.toBe(tg.variant) }
        })
      }
    }
    const t = makeTrial(3, rng)
    expect(isCorrect(t, t.targetIndex)).toBe(true)
    expect(isCorrect(t, (t.targetIndex + 1) % t.items.length)).toBe(false)
  })
  it('scatter：不重叠且都在边界内', () => {
    const rng = createRng(9)
    const cases = [
      { n: 6, w: 390, h: 520, r: 26, d: 60 },
      { n: 30, w: 390, h: 520, r: 7, d: 40 },
      { n: 30, w: 1100, h: 600, r: 14, d: 40 },
      { n: 20, w: 300, h: 300, r: 15, d: 40 },
    ]
    for (const c of cases) {
      for (let k = 0; k < 20; k++) {
        const pts = scatter(c.n, c.w, c.h, c.r, c.d, rng)
        expect(pts).not.toBeNull()
        expect(pts!.length).toBe(c.n)
        for (const p of pts!) {
          expect(p.x - c.r).toBeGreaterThanOrEqual(0); expect(p.x + c.r).toBeLessThanOrEqual(c.w)
          expect(p.y - c.r).toBeGreaterThanOrEqual(0); expect(p.y + c.r).toBeLessThanOrEqual(c.h)
        }
        for (let i = 0; i < pts!.length; i++) for (let j = i + 1; j < pts!.length; j++) {
          const dd = Math.hypot(pts![i].x - pts![j].x, pts![i].y - pts![j].y)
          expect(dd).toBeGreaterThanOrEqual(Math.max(c.d, 2 * c.r))
        }
      }
    }
    // 放不下时返回 null
    expect(scatter(50, 100, 100, 20, 40, rng)).toBeNull()
  })
})
