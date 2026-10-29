import { describe, it, expect } from 'vitest'
import { remainingSec, isLocked, needsBreak } from '../../src/core/sessionTimer'

describe('sessionTimer', () => {
  it('剩余秒数', () => {
    expect(remainingSec(300, 12)).toBe(420)
    expect(remainingSec(900, 12)).toBe(0)
  })
  it('用完即锁定', () => {
    expect(isLocked(720, 12)).toBe(true)
    expect(isLocked(719, 12)).toBe(false)
  })
  it('每 breakEveryMin 分钟需要休息', () => {
    expect(needsBreak(299, 5)).toBe(false)
    expect(needsBreak(300, 5)).toBe(true)
  })
})
