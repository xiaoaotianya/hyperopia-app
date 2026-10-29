import { describe, it, expect } from 'vitest'
import { pickDailyPlan, type PlanGame } from '../../src/core/dailyPlan'

const games: PlanGame[] = [
  { id: 'a1', category: 'fine' }, { id: 'a2', category: 'fine' }, { id: 'a3', category: 'fine' },
  { id: 'b1', category: 'contrast' }, { id: 'b2', category: 'contrast' },
  { id: 'c1', category: 'eye-move' }, { id: 'c2', category: 'eye-move' }, { id: 'c3', category: 'eye-move' },
  { id: 'd1', category: 'hand-eye' }, { id: 'd2', category: 'hand-eye' },
]

describe('dailyPlan', () => {
  it('4 类各至少 1 个，共 count 个，无重复', () => {
    const p = pickDailyPlan(games, {}, '2026-10-29', 5)
    expect(p).toHaveLength(5)
    expect(new Set(p).size).toBe(5)
    for (const c of ['fine', 'contrast', 'eye-move', 'hand-eye']) expect(p.some(id => games.find(g => g.id === id)!.category === c)).toBe(true)
  })
  it('同一天结果确定', () => {
    expect(pickDailyPlan(games, {}, '2026-10-29', 5)).toEqual(pickDailyPlan(games, {}, '2026-10-29', 5))
  })
  it('不包含昨天玩过的游戏（候选足够时）', () => {
    const yesterday = ['a1', 'b1', 'c1', 'd1']
    const p = pickDailyPlan(games, { '2026-10-28': yesterday }, '2026-10-29', 4)
    expect(p.some(id => yesterday.includes(id))).toBe(false)
  })
  it('优先选最近玩得少的', () => {
    const hist = { '2026-10-27': ['a1', 'a2'], '2026-10-26': ['a1', 'a2'] }
    const p = pickDailyPlan(games, hist, '2026-10-29', 4)
    expect(p).toContain('a3')
  })
})
