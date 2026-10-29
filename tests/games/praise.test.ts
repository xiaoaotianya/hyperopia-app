import { describe, it, expect, beforeEach } from 'vitest'
import { PRAISES, maybePraise, resetPraise } from '../../src/games/praise'

describe('praise', () => {
  beforeEach(() => resetPraise())
  it('至少 6 条中文表扬', () => {
    expect(PRAISES.length).toBeGreaterThanOrEqual(6)
    expect(new Set(PRAISES).size).toBe(PRAISES.length)
  })
  it('每 3～4 次答对才说一次', () => {
    const said: string[] = []
    const ctx = { speak: (t: string) => { said.push(t) } }
    const flags = Array.from({ length: 40 }, () => maybePraise(ctx))
    const idx = flags.map((f, i) => (f ? i : -1)).filter(i => i >= 0)
    expect(idx[0]).toBe(2)
    for (let i = 1; i < idx.length; i++) {
      expect(idx[i] - idx[i - 1]).toBeGreaterThanOrEqual(3)
      expect(idx[i] - idx[i - 1]).toBeLessThanOrEqual(4)
    }
    expect(said.length).toBe(idx.length)
    said.forEach(s => expect(PRAISES).toContain(s))
  })
})
