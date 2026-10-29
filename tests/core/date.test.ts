import { describe, it, expect } from 'vitest'
import { addDays, daysBetween, todayKey } from '../../src/core/date'

describe('date', () => {
  it('todayKey 格式化本地日期', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
  it('addDays 跨月跨年', () => {
    expect(addDays('2026-10-29', 3)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('daysBetween 为 b - a 的天数', () => {
    expect(daysBetween('2026-10-01', '2026-10-29')).toBe(28)
    expect(daysBetween('2026-10-29', '2026-10-01')).toBe(-28)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2) // 夏令时无关
  })
})
