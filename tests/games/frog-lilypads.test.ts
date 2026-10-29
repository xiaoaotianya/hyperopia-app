import { describe, it, expect } from 'vitest'
import {
  MAX_LEVEL, padsPerRow, rowCount, dwellMs, padArcmin, layoutPads, nextPad, hopPos, HOP_MS,
} from '../../src/games/frog-lilypads/logic'

describe('frog-lilypads logic', () => {
  it('参数随等级变化并有上下限', () => {
    expect(padsPerRow(0)).toBe(3)
    expect(padsPerRow(4)).toBe(5)
    expect(padsPerRow(MAX_LEVEL)).toBe(8)
    expect(rowCount(0)).toBe(1)
    expect(rowCount(5)).toBe(1)
    expect(rowCount(6)).toBe(2)
    expect(rowCount(9)).toBe(2)
    expect(rowCount(10)).toBe(3)
    expect(dwellMs(0)).toBe(2500)
    expect(dwellMs(MAX_LEVEL)).toBe(900)
    expect(padArcmin(0)).toBeCloseTo(160)
    expect(padArcmin(5)).toBeLessThan(padArcmin(4))
    expect(HOP_MS).toBeGreaterThanOrEqual(350)
    expect(HOP_MS).toBeLessThanOrEqual(450)
  })

  it('每一行荷叶从左到右排开，换行后到下一行最左边', () => {
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      const L = layoutPads(lv, 1180, 740, 70)
      expect(L.pads).toHaveLength(padsPerRow(lv) * rowCount(lv))
      let idx = 0
      const seq: number[] = [idx]
      for (let k = 1; k < L.pads.length; k++) { idx = nextPad(idx, L.pads.length); seq.push(idx) }
      expect(seq).toEqual(L.pads.map((_, i) => i))
      for (let k = 1; k < seq.length; k++) {
        const a = L.pads[seq[k - 1]], b = L.pads[seq[k]]
        if (a.row === b.row) {
          expect(b.x).toBeGreaterThan(a.x)        // 同一行：向右
          expect(b.col).toBe(a.col + 1)
        } else {
          expect(b.row).toBe(a.row + 1)            // 换行：下一行
          expect(b.col).toBe(0)                    // 最左边
          expect(b.y).toBeGreaterThan(a.y)
          const rowXs = L.pads.filter(p => p.row === b.row).map(p => p.x)
          expect(b.x).toBe(Math.min(...rowXs))
        }
      }
    }
  })

  it('跳完最后一片回到第一片', () => {
    expect(nextPad(5, 6)).toBe(0)
    expect(nextPad(2, 6)).toBe(3)
  })

  it('荷叶尺寸放得下且不小于 48px', () => {
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      for (const [w, h] of [[390, 770], [1180, 740], [320, 500]]) {
        const L = layoutPads(lv, w, h, 200)
        expect(L.size).toBeGreaterThanOrEqual(48)
        L.pads.forEach(p => {
          if (L.size * padsPerRow(lv) <= w) {
            expect(p.x - L.size / 2).toBeGreaterThanOrEqual(-0.01)
            expect(p.x + L.size / 2).toBeLessThanOrEqual(w + 0.01)
          }
          expect(p.y - L.size / 2).toBeGreaterThanOrEqual(-0.01)
          expect(p.y + L.size / 2).toBeLessThanOrEqual(h + 0.01)
        })
      }
    }
    // 想要的尺寸较小时按想要的尺寸；下限 48px
    expect(layoutPads(0, 1180, 740, 70).size).toBeCloseTo(70)
    expect(layoutPads(0, 1180, 740, 20).size).toBe(48)
  })

  it('跳跃弧线：起点、终点准确，中间向上拱起', () => {
    const a = { x: 0, y: 100 }, b = { x: 100, y: 100 }
    const start = hopPos(a, b, 0, 40)
    expect(start.x).toBeCloseTo(0); expect(start.y).toBeCloseTo(100)
    const end = hopPos(a, b, 1, 40)
    expect(end.x).toBeCloseTo(100); expect(end.y).toBeCloseTo(100)
    const mid = hopPos(a, b, 0.5, 40)
    expect(mid.x).toBeCloseTo(50); expect(mid.y).toBeCloseTo(60)
  })
})
