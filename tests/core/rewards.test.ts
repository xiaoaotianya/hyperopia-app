import { describe, it, expect } from 'vitest'
import { STICKERS, nextSticker, glassesStreak } from '../../src/core/rewards'

describe('rewards', () => {
  it('按顺序循环发放贴纸', () => {
    expect(nextSticker([])).toBe(STICKERS[0])
    expect(nextSticker(STICKERS.slice())).toBe(STICKERS[0])
  })
  it('连续戴镜天数', () => {
    const days = { '2026-10-27': { glassesOn: true }, '2026-10-28': { glassesOn: true }, '2026-10-29': { glassesOn: true }, '2026-10-25': { glassesOn: true } }
    expect(glassesStreak(days, '2026-10-29')).toBe(3)
  })
})
