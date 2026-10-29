import { describe, it, expect } from 'vitest'
import { createRng, seedFromString, randInt, shuffle } from '../../src/core/random'
import { todayKey } from '../../src/core/date'

describe('random', () => {
  it('同一种子产生相同序列', () => {
    const a = createRng(42), b = createRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('seedFromString 稳定', () => {
    expect(seedFromString('2026-10-29')).toBe(seedFromString('2026-10-29'))
    expect(seedFromString('2026-10-29')).not.toBe(seedFromString('2026-10-30'))
  })
  it('randInt 在闭区间内', () => {
    const r = createRng(1)
    for (let i = 0; i < 200; i++) { const v = randInt(r, 2, 5); expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThanOrEqual(5) }
  })
  it('shuffle 保持元素', () => {
    expect(shuffle(createRng(3), [1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4])
  })
  it('todayKey 格式', () => {
    expect(todayKey(new Date(2026, 9, 9))).toBe('2026-10-09')
  })
})
