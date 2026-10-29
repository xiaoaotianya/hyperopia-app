import { describe, it, expect } from 'vitest'
import {
  acuityInRange, fmtAge, levelProgress, observationSummary, rangeStart, trainingSummary, wearSummary,
  type GameLike,
} from '../../src/core/report'
import { GAMES } from '../../src/games/registry'
import type { AcuityTest, DayRecord, GameRecord } from '../../src/core/storage'

const TODAY = '2026-10-29'
const day = (p: Partial<DayRecord> = {}): DayRecord => ({ glassesOn: false, secondsTrained: 0, gamesPlayed: [], plan: [], ...p })

describe('rangeStart', () => {
  it('1 / 3 / 6 个月', () => {
    expect(rangeStart(TODAY, 1)).toBe('2026-09-30')
    expect(rangeStart(TODAY, 3)).toBe('2026-07-30')
    expect(rangeStart(TODAY, 6)).toBe('2026-04-30')
  })
})

describe('wearSummary', () => {
  it('计数、达标占比、日历条', () => {
    const days = {
      '2026-10-27': day({ wear: 'full' }), '2026-10-28': day({ wear: 'most' }), '2026-10-29': day({ wear: 'none' }),
      '2026-10-20': day({ wear: 'less' }), '2026-01-01': day({ wear: 'full' }),
    }
    const s = wearSummary(days, '2026-10-01', TODAY)
    expect(s.totalDays).toBe(29)
    expect(s.counts).toEqual({ full: 1, most: 1, less: 1, none: 1 })
    expect(s.recorded).toBe(4)
    expect(s.good).toBe(2)
    expect(s.goodPct).toBe(50)
    expect(s.strip).toHaveLength(29)
    expect(s.strip[0]).toEqual({ date: '2026-10-01' })
    expect(s.strip[28]).toEqual({ date: TODAY, wear: 'none' })
  })
  it('没有记录 → goodPct 为 null', () => {
    expect(wearSummary({}, '2026-10-01', TODAY).goodPct).toBeNull()
  })
})

describe('acuityInRange', () => {
  const t = (date: string): AcuityTest => ({
    id: date, date, ageMonths: 50, distanceMm: 400, pxPerMm: 6, bestMeasurableLogmar: 0,
    od: { logmar: 0.3, trials: [] }, os: { logmar: 0.4, trials: [] }, flags: [],
  })
  it('区间内按时间正序；最近 3 次倒序，不受区间限制', () => {
    const r = acuityInRange([t('2026-10-20'), t('2026-05-01'), t('2026-09-01'), t('2026-10-01')], '2026-09-30', TODAY)
    expect(r.inRange.map(x => x.date)).toEqual(['2026-10-01', '2026-10-20'])
    expect(r.latest3.map(x => x.date)).toEqual(['2026-10-20', '2026-10-01', '2026-09-01'])
  })
})

describe('observationSummary', () => {
  it('重点信号、经常项、备注与随时记录', () => {
    const s = observationSummary(
      [
        { id: 'a', date: '2026-10-01', answers: { 'eso-off': 'sometimes', rub: 'often', squint: 'sometimes' }, note: '晚上较明显' },
        { id: 'b', date: '2026-10-20', answers: { 'eso-off': 'often', 'one-eye': 'often' }, note: '' },
        { id: 'c', date: '2026-01-01', answers: { 'eso-on': 'often' }, note: '旧' },
      ],
      [{ id: 'o', date: '2026-10-10', items: ['squint'], note: '看电视眯眼' }, { id: 'p', date: '2025-01-01', items: [], note: '旧' }],
      '2026-09-30', TODAY,
    )
    expect(s.checklistCount).toBe(2)
    expect(s.key).toEqual([{ id: 'eso-off', dates: ['2026-10-01', '2026-10-20'] }, { id: 'one-eye', dates: ['2026-10-20'] }])
    expect(s.often).toEqual([{ id: 'rub', dates: ['2026-10-01'] }])
    expect(s.notes.map(n => [n.date, n.source])).toEqual([['2026-10-01', 'checklist'], ['2026-10-10', 'observation']])
  })
})

describe('levelProgress', () => {
  it('按等级区间的百分比，可为负', () => {
    expect(levelProgress(10, 0, 4)).toBeCloseTo(40)
    expect(levelProgress(20, 2, 1)).toBeCloseTo(-5)
    expect(levelProgress(10, 3, 3)).toBe(0)
    expect(levelProgress(0, 0, 0)).toBe(0)
  })
  it('真实游戏到最高等级时不超过 100%', () => {
    for (const g of GAMES) expect(levelProgress(g.levels, 0, g.levels), g.id).toBe(100)
  })
})

describe('trainingSummary', () => {
  const games: GameLike[] = [
    { id: 'a', category: 'fine', levels: 10 },
    { id: 'b', category: 'fine', levels: 20 },
    { id: 'c', category: 'hand-eye', levels: 10 },
    { id: 'd', category: 'contrast', levels: 10 },
    { id: 'e', category: 'eye-move', levels: 5 },
  ]
  const h = (date: string, levelEnd: number) => ({ date, levelEnd, trials: 10, correct: 8 })
  const records: Record<string, GameRecord> = {
    a: { staircase: null, history: [h('2026-01-01', 0), h('2026-10-01', 0), h('2026-10-20', 4)] }, // 0→4 / 10: 40%
    b: { staircase: null, history: [h('2026-10-02', 0), h('2026-10-21', 2)] },                    // 0→2 / 20: 10%
    c: { staircase: null, history: [h('2026-10-05', 2), h('2026-10-25', 1)] },                    // 下降 → 保持
    d: { staircase: null, history: [h('2026-10-05', 3)] },                                          // 只有 1 条 → 0
    e: { staircase: null, history: [h('2026-01-05', 1), h('2026-01-06', 5)] },                    // 区间外
  }
  const days = {
    '2026-10-01': day({ secondsTrained: 600 }), '2026-10-20': day({ secondsTrained: 300 }),
    '2026-10-21': day({ secondsTrained: 0 }), '2026-01-01': day({ secondsTrained: 900 }),
  }
  it('按类汇总等级进步，只写进步或保持', () => {
    const s = trainingSummary(games, records, days, '2026-09-30', TODAY)
    expect(s.days).toBe(2)
    expect(s.minutes).toBe(15)
    const c = Object.fromEntries(s.categories.map(x => [x.category, x]))
    expect(c.fine.games).toBe(2)
    expect(c.fine.pct).toBe(25)
    expect(c.fine.text).toBe('进步 25%')
    expect(c['hand-eye'].text).toBe('保持') // 下降也只写"保持"
    expect(c['hand-eye'].pct).toBe(0)
    expect(c.contrast.text).toBe('保持')
    expect(c['eye-move'].pct).toBeNull()
    expect(c['eye-move'].text).toBe('区间内没有训练')
    expect(s.categories.map(x => x.text).join()).not.toContain('退步')
  })
  it('真实游戏：shadow-match 升到 10 级以上、flip-memory 小幅升级不会夸大', () => {
    const recs: Record<string, GameRecord> = {
      'shadow-match': { staircase: null, history: [h('2026-10-01', 0), h('2026-10-20', 12)] },
      'flip-memory': { staircase: null, history: [h('2026-10-01', 0), h('2026-10-20', 1)] },
    }
    const s = trainingSummary(GAMES, recs, {}, '2026-09-30', TODAY)
    const sm = GAMES.find(g => g.id === 'shadow-match')!, fm = GAMES.find(g => g.id === 'flip-memory')!
    const c = s.categories.find(x => x.category === sm.category)!
    expect(fm.category).toBe(sm.category)
    expect(c.games).toBe(2)
    expect(c.pct).toBe(Math.round(((12 / sm.levels) * 100 + (1 / fm.levels) * 100) / 2))
    expect(c.pct).toBeLessThan(100)
  })
  it('空数据', () => {
    const s = trainingSummary(games, {}, {}, '2026-09-30', TODAY)
    expect(s.days).toBe(0)
    expect(s.categories.every(c => c.pct === null)).toBe(true)
  })
})

describe('fmtAge', () => {
  it('月龄显示', () => {
    expect(fmtAge(null)).toBe('未填写')
    expect(fmtAge(50)).toBe('4 岁 2 个月')
    expect(fmtAge(48)).toBe('4 岁')
    expect(fmtAge(10)).toBe('10 个月')
  })
})
