import { describe, it, expect } from 'vitest'
import { ageMonths, ageThresholdLogmar, logmarToDecimal } from '../../src/core/ageNorms'

describe('ageNorms', () => {
  it('月龄按月份差计算（出生月按 1 日计）', () => {
    expect(ageMonths('2022-10', '2026-10-29')).toBe(48)
    expect(ageMonths('2022-11', '2026-10-01')).toBe(47)
    expect(ageMonths('2022-12', '2026-10-31')).toBe(46)
    expect(ageMonths('2026-10', '2026-10-29')).toBe(0)
  })
  it('无出生年月、格式错误或晚于今天时为 null', () => {
    expect(ageMonths(null, '2026-10-29')).toBeNull()
    expect(ageMonths('', '2026-10-29')).toBeNull()
    expect(ageMonths('2022/10', '2026-10-29')).toBeNull()
    expect(ageMonths('2026-11', '2026-10-29')).toBeNull()
  })
  it('参考线边界', () => {
    expect(ageThresholdLogmar(null)).toBeNull()
    expect(ageThresholdLogmar(35)).toBeNull()
    expect(ageThresholdLogmar(36)).toBe(0.4)
    expect(ageThresholdLogmar(47)).toBe(0.4)
    expect(ageThresholdLogmar(48)).toBe(0.3)
    expect(ageThresholdLogmar(59)).toBe(0.3)
    expect(ageThresholdLogmar(60)).toBe(0.2)
    expect(ageThresholdLogmar(100)).toBe(0.2)
  })
  it('logMAR 转小数视力', () => {
    expect(logmarToDecimal(0)).toBe(1)
    expect(logmarToDecimal(0.3)).toBe(0.5)
    expect(logmarToDecimal(0.2)).toBe(0.63)
    expect(logmarToDecimal(1)).toBe(0.1)
  })
})
