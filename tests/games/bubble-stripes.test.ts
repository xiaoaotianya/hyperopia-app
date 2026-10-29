import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import {
  MAX_LEVEL, OBLIQUE_FROM, ORIENT_DEG, SF_CYCLE, THEMES, contrast, isCorrect, makeTrial, orientedGabor, optionsFor,
} from '../../src/games/bubble-stripes/logic'

describe('bubble-stripes logic', () => {
  it('对比度 0.8 → 0.02（对数步长），单调递减', () => {
    expect(MAX_LEVEL).toBe(20)
    expect(contrast(0)).toBeCloseTo(0.8)
    expect(contrast(MAX_LEVEL)).toBeCloseTo(0.02, 3)
    for (let lv = 1; lv <= MAX_LEVEL; lv++) expect(contrast(lv)).toBeLessThan(contrast(lv - 1))
    expect(contrast(99)).toBe(0.02)
  })
  it('低等级竖/横，12 级起左斜/右斜', () => {
    expect(OBLIQUE_FROM).toBe(12)
    expect(optionsFor(0)).toEqual(['vertical', 'horizontal'])
    expect(optionsFor(11)).toEqual(['vertical', 'horizontal'])
    expect(optionsFor(12)).toEqual(['oblique45', 'oblique135'])
    expect(ORIENT_DEG.vertical).toBe(90)
    expect(ORIENT_DEG.horizontal).toBe(0)
    expect(ORIENT_DEG.oblique45).toBe(45)
    expect(ORIENT_DEG.oblique135).toBe(135)
  })
  it('空间频率 2/4/6 轮换，答案两边都出现', () => {
    const rng = createRng(3)
    const ts = Array.from({ length: 6 }, (_, i) => makeTrial(5, rng, i))
    expect(ts.map(t => t.sf)).toEqual([...SF_CYCLE, ...SF_CYCLE])
    expect(SF_CYCLE).toEqual([2, 4, 6])
    const ans = new Set(Array.from({ length: 60 }, (_, i) => makeTrial(14, rng, i).answer))
    expect([...ans].sort()).toEqual([0, 1])
    const t = makeTrial(14, rng, 0)
    expect(t.options).toEqual(optionsFor(14))
    expect(t.contrast).toBe(contrast(14))
    expect(THEMES).toContain(t.theme)
    expect(isCorrect(t, t.answer)).toBe(true)
    expect(isCorrect(t, t.answer === 0 ? 1 : 0)).toBe(false)
  })
  it('orientedGabor：沿条纹方向亮度只受包络影响', () => {
    const c = 0.5, lam = 10, sig = 30
    const env = (d2: number) => Math.round(128 + 127 * c * Math.exp(-d2 / (2 * sig * sig)))
    // 竖条纹：沿 y 方向（x=0）是峰；x 方向半周期为谷
    expect(orientedGabor(0, 7, c, lam, sig, 90)).toBe(env(49))
    expect(orientedGabor(5, 0, c, lam, sig, 90)).toBeLessThan(128)
    // 横条纹：沿 x 方向是峰，y 方向半周期为谷
    expect(orientedGabor(7, 0, c, lam, sig, 0)).toBe(env(49))
    expect(orientedGabor(0, 5, c, lam, sig, 0)).toBeLessThan(128)
    // 45°（"/"，屏幕 y 向下）：沿 (d,-d) 是峰；垂直方向半周期为谷
    const h = 5 / Math.SQRT2
    expect(orientedGabor(5, -5, c, lam, sig, 45)).toBe(env(50))
    expect(orientedGabor(h, h, c, lam, sig, 45)).toBeLessThan(128)
    // 135°（"\"）：沿 (d,d) 是峰
    expect(orientedGabor(5, 5, c, lam, sig, 135)).toBe(env(50))
    expect(orientedGabor(h, -h, c, lam, sig, 135)).toBeLessThan(128)
    for (let x = -30; x <= 30; x += 4) {
      const v = orientedGabor(x, x / 3, 1, 6, 20, 135)
      expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(255)
    }
  })
})
