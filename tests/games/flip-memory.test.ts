import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import {
  MAX_LEVEL, pairCount, previewMs, makeBoard, initState, flip, closeOpen, isCleared, chooseGrid, THEMES,
} from '../../src/games/flip-memory/logic'

describe('flip-memory logic', () => {
  it('对数和预览时间', () => {
    expect(pairCount(0)).toBe(2)
    expect(pairCount(MAX_LEVEL)).toBe(8)
    expect(previewMs(0)).toBe(4000)
    expect(previewMs(MAX_LEVEL)).toBe(1500)
    expect(THEMES.length).toBeGreaterThanOrEqual(3)
    THEMES.forEach(t => expect(new Set(t.faces).size).toBeGreaterThanOrEqual(8))
  })

  it('牌面：每种恰好两张', () => {
    const rng = createRng(3)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      const cards = makeBoard(lv, rng)
      expect(cards).toHaveLength(pairCount(lv) * 2)
      const counts = new Map<number, number>()
      cards.forEach(c => counts.set(c, (counts.get(c) ?? 0) + 1))
      expect(counts.size).toBe(pairCount(lv))
      counts.forEach(v => expect(v).toBe(2))
    }
  })

  it('配对成功 → match', () => {
    let s = initState([0, 1, 0, 1], false)
    let r = flip(s, 0); expect(r.event).toBe('first'); s = r.state
    r = flip(s, 2); expect(r.event).toBe('match'); s = r.state
    expect(s.matched[0] && s.matched[2]).toBe(true)
    expect(s.open).toEqual([])
    expect(isCleared(s)).toBe(false)
    s = flip(s, 1).state
    r = flip(s, 3); expect(r.event).toBe('match')
    expect(isCleared(r.state)).toBe(true)
  })

  it('没有预览：第二张的搭档第一次见，不算错', () => {
    let s = initState([0, 1, 1, 0], false)
    s = flip(s, 0).state
    const r = flip(s, 1)           // 1 的搭档是 2，从没见过
    expect(r.event).toBe('mismatch-free')
    expect(r.state.open).toEqual([0, 1])
  })

  it('第二张的搭档已经见过却翻错 → 算错', () => {
    let s = initState([0, 1, 1, 0], false)
    s = flip(s, 2).state                     // 看到 2（面值 1）
    s = flip(s, 3).state                     // 看到 3（面值 0），搭档 0 没见过 → 不算
    s = closeOpen(s)
    s = flip(s, 0).state
    const r = flip(s, 1)                     // 1 的搭档 2 已见过
    expect(r.event).toBe('mismatch-counted')
  })

  it('预览算作见过：之后翻错都算错', () => {
    let s = initState([0, 1, 1, 0], true)
    s = flip(s, 0).state
    expect(flip(s, 1).event).toBe('mismatch-counted')
  })

  it('打开两张时、已配对或同一张：忽略；状态不被修改', () => {
    let s = initState([0, 1, 1, 0], false)
    s = flip(s, 0).state
    expect(flip(s, 0).event).toBe('ignored')
    s = flip(s, 1).state
    const frozen = JSON.stringify(s)
    expect(flip(s, 2).event).toBe('ignored')   // 两张开着，需先 closeOpen
    expect(JSON.stringify(s)).toBe(frozen)
    s = closeOpen(s)
    expect(s.open).toEqual([])
    s = flip(s, 1).state; s = flip(s, 2).state
    expect(s.matched[1]).toBe(true)
    expect(flip(s, 1).event).toBe('ignored')
  })

  it('网格：竖屏多行、横屏多列，卡片尽量大且放得下', () => {
    const p = chooseGrid(16, 358, 700, 10)
    expect(p.rows).toBeGreaterThan(p.cols)
    const l = chooseGrid(16, 1150, 700, 10)
    expect(l.cols).toBeGreaterThan(l.rows)
    for (const [g, W, H] of [[p, 358, 700], [l, 1150, 700]] as const) {
      expect(g.cols * g.rows).toBeGreaterThanOrEqual(16)
      expect(g.cols * g.card + (g.cols - 1) * 10).toBeLessThanOrEqual(W + 0.01)
      expect(g.rows * g.card + (g.rows - 1) * 10).toBeLessThanOrEqual(H + 0.01)
    }
    expect(p.card).toBeGreaterThanOrEqual(64)
  })
})
