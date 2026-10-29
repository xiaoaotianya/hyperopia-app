import { describe, it, expect } from 'vitest'
import { createStaircase, stepStaircase, warmupLevel, type StaircaseState } from '../../src/core/staircase'

const run = (s: StaircaseState, seq: boolean[]) => seq.reduce((acc, c) => stepStaircase(acc, c), s)

describe('staircase', () => {
  it('连对 3 次升级（初始步长 2）', () => {
    const s = run(createStaircase(10, 0), [true, true, true])
    expect(s.level).toBe(2)
  })
  it('连对不足 3 次不升级', () => {
    expect(run(createStaircase(10, 0), [true, true]).level).toBe(0)
  })
  it('错一次降级且清空连对', () => {
    const s = run(createStaircase(10, 4), [true, true, false])
    expect(s.level).toBe(2)
    expect(s.streak).toBe(0)
  })
  it('两次反转后步长变为 1', () => {
    // 升(2) -> 降(反转1) -> 升(反转2) -> 之后步长1
    let s = run(createStaircase(20, 0), [true, true, true, false, true, true, true])
    expect(s.reversals).toBe(2)
    const before = s.level
    s = run(s, [true, true, true])
    expect(s.level).toBe(before + 1)
  })
  it('不超出边界', () => {
    expect(run(createStaircase(3, 3), [true, true, true]).level).toBe(3)
    expect(run(createStaircase(3, 0), [false]).level).toBe(0)
  })
  it('热身回退 2 级', () => {
    expect(warmupLevel(5)).toBe(3)
    expect(warmupLevel(1)).toBe(0)
  })
})
