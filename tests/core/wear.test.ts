import { describe, it, expect } from 'vitest'
import { WEAR_LABELS, isGoodDay, goodStreak, lastNDays, weekGoodCount, treeState, STREAK_BADGES, newBadges, badgeUpdate, badgeSticker, badgeStreak } from '../../src/core/wear'
import type { DayRecord, WearLevel } from '../../src/core/storage'

const rec = (wear?: WearLevel): DayRecord => ({ glassesOn: true, secondsTrained: 0, gamesPlayed: [], plan: [], ...(wear ? { wear } : {}) })
const days = (m: Record<string, WearLevel | undefined>) =>
  Object.fromEntries(Object.entries(m).map(([k, w]) => [k, rec(w)]))

describe('wear', () => {
  it('档位文案与达标判定', () => {
    expect(WEAR_LABELS).toEqual({ full: '全天', most: '大半天', less: '少于一半', none: '没戴' })
    expect(isGoodDay('full')).toBe(true); expect(isGoodDay('most')).toBe(true)
    expect(isGoodDay('less')).toBe(false); expect(isGoodDay('none')).toBe(false); expect(isGoodDay()).toBe(false)
  })
  it('连续天数：今天已记录则从今天数起', () => {
    expect(goodStreak(days({ '2026-10-27': 'full', '2026-10-28': 'most', '2026-10-29': 'full' }), '2026-10-29')).toBe(3)
  })
  it('连续天数：今天未记录则从昨天数起', () => {
    const d = days({ '2026-10-27': 'full', '2026-10-28': 'most' })
    expect(goodStreak(d, '2026-10-29')).toBe(2)
    d['2026-10-29'] = rec() // 有记录但无 wear 也算未记录
    expect(goodStreak(d, '2026-10-29')).toBe(2)
  })
  it('连续天数：今天记录为不达标则为 0', () => {
    expect(goodStreak(days({ '2026-10-28': 'full', '2026-10-29': 'less' }), '2026-10-29')).toBe(0)
  })
  it('连续天数：中间断档或 less 都会中断', () => {
    expect(goodStreak(days({ '2026-10-25': 'full', '2026-10-27': 'full', '2026-10-28': 'full' }), '2026-10-29')).toBe(2)
    expect(goodStreak(days({ '2026-10-26': 'full', '2026-10-27': 'less', '2026-10-28': 'full' }), '2026-10-29')).toBe(1)
  })
  it('连续天数：跨月', () => {
    expect(goodStreak(days({ '2026-10-31': 'full', '2026-11-01': 'full' }), '2026-11-01')).toBe(2)
  })
  it('lastNDays 从旧到新，含今天', () => {
    const r = lastNDays(days({ '2026-10-29': 'full', '2026-10-27': 'less', '2026-10-22': 'full' }), '2026-10-29', 7)
    expect(r.map(x => x.date)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'])
    expect(r[4].wear).toBe('less'); expect(r[6].wear).toBe('full'); expect(r[0].wear).toBeUndefined()
  })
  it('近 7 天达标数：边界含今天，不含第 8 天', () => {
    const d = days({ '2026-10-22': 'full', '2026-10-23': 'full', '2026-10-25': 'most', '2026-10-26': 'less', '2026-10-29': 'full' })
    expect(weekGoodCount(d, '2026-10-29')).toBe(3)
  })
  it('小树：叶子=达标天总数，7 片一朵花，30 片一个果', () => {
    expect(treeState({})).toEqual({ leaves: 0, flowers: 0, fruits: 0 })
    const m: Record<string, WearLevel> = {}
    for (let i = 0; i < 30; i++) m[`2026-01-${String(i + 1).padStart(2, '0')}`] = i % 2 ? 'full' : 'most'
    m['2026-02-01'] = 'less'; m['2026-02-02'] = 'none'
    expect(treeState(days(m))).toEqual({ leaves: 30, flowers: 4, fruits: 1 })
    expect(treeState(days({ a: 'full', b: 'full', c: 'full', d: 'full', e: 'full', f: 'full' }))).toEqual({ leaves: 6, flowers: 0, fruits: 0 })
    expect(treeState(days({ a: 'full', b: 'full', c: 'full', d: 'full', e: 'full', f: 'full', g: 'most' }))).toEqual({ leaves: 7, flowers: 1, fruits: 0 })
  })
  it('里程碑跨越', () => {
    expect(STREAK_BADGES).toEqual([3, 7, 14, 30])
    expect(newBadges(2, 3)).toEqual([3])
    expect(newBadges(3, 3)).toEqual([])
    expect(newBadges(3, 4)).toEqual([])
    expect(newBadges(0, 7)).toEqual([3, 7])
    expect(newBadges(6, 30)).toEqual([7, 14, 30])
    expect(newBadges(30, 31)).toEqual([])
    expect(newBadges(5, 0)).toEqual([])
  })
  describe('badgeUpdate', () => {
    it('跨过里程碑时发放，并把 next 记为当前天数', () => {
      expect(badgeUpdate(0, 3)).toEqual({ award: [3], next: 3 })
      expect(badgeUpdate(2, 8)).toEqual({ award: [3, 7], next: 8 })
      expect(badgeUpdate(3, 5)).toEqual({ award: [], next: 5 })
      expect(badgeUpdate(5, 5)).toEqual({ award: [], next: 5 })
    })
    it('同一连续期内不会重复发放', () => {
      let last = 0
      const got: number[] = []
      for (const s of [1, 2, 3, 3, 4, 7, 7, 8]) { const r = badgeUpdate(last, s); got.push(...r.award); last = r.next }
      expect(got).toEqual([3, 7])
    })
    it('断档后 next 回落到当前天数，之后可以重新获得', () => {
      expect(badgeUpdate(8, 0)).toEqual({ award: [], next: 0 })
      expect(badgeUpdate(8, 2)).toEqual({ award: [], next: 2 })
      let last = 8
      const got: number[] = []
      for (const s of [0, 1, 2, 3]) { const r = badgeUpdate(last, s); got.push(...r.award); last = r.next }
      expect(got).toEqual([3])
    })
    it('今天当天改档（全天 ↔ 少于一半）不会重复发放', () => {
      const T = '2026-10-29'
      const base = { '2026-10-22': 'full', '2026-10-23': 'full', '2026-10-24': 'full', '2026-10-25': 'full', '2026-10-26': 'full', '2026-10-27': 'full', '2026-10-28': 'full' } as const
      let last = 0
      const got: number[] = []
      // 每次进入小朋友首页都按当前记录检查一次
      for (const w of [undefined, 'less', 'full', 'less', 'full'] as const) {
        const r = badgeUpdate(last, badgeStreak(days({ ...base, [T]: w }), T)); got.push(...r.award); last = r.next
      }
      expect(got).toEqual([3, 7])
    })
    it('跨里程碑那天改档也不会重复发放', () => {
      const T = '2026-10-29'
      const base = { '2026-10-27': 'full', '2026-10-28': 'full' } as const
      let last = 0
      const got: number[] = []
      for (const w of [undefined, 'full', 'less', 'full', 'none', 'most'] as const) {
        const r = badgeUpdate(last, badgeStreak(days({ ...base, [T]: w }), T)); got.push(...r.award); last = r.next
      }
      expect(got).toEqual([3])
    })
    it('过去某天真正断档后可以重新获得', () => {
      let last = 0
      const got: number[] = []
      const check = (m: Record<string, WearLevel | undefined>, t: string) => {
        const r = badgeUpdate(last, badgeStreak(days(m), t)); got.push(...r.award); last = r.next
      }
      const m: Record<string, WearLevel | undefined> = { '2026-10-01': 'full', '2026-10-02': 'full', '2026-10-03': 'full' }
      check(m, '2026-10-03')                 // 3 天 → 发 3
      m['2026-10-04'] = 'less'; check(m, '2026-10-04')
      check(m, '2026-10-05')                 // 昨天没达标 → 断档
      m['2026-10-05'] = 'full'; m['2026-10-06'] = 'full'; m['2026-10-07'] = 'full'; check(m, '2026-10-07')
      expect(got).toEqual([3, 3])
    })
    it('badgeStreak：今天未达标时从昨天数起', () => {
      expect(badgeStreak(days({ '2026-10-28': 'full', '2026-10-29': 'less' }), '2026-10-29')).toBe(1)
      expect(badgeStreak(days({ '2026-10-28': 'full', '2026-10-29': 'full' }), '2026-10-29')).toBe(2)
      expect(badgeStreak(days({ '2026-10-28': 'full' }), '2026-10-29')).toBe(1)
      expect(badgeStreak(days({ '2026-10-28': 'none' }), '2026-10-29')).toBe(0)
    })
    it('贴纸字符串各不相同', () => {
      expect(STREAK_BADGES.map(badgeSticker)).toEqual(['👓🏅3', '👓🏅7', '👓🏅14', '👓🏅30'])
    })
  })
})
