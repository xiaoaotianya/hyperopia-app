import { describe, it, expect } from 'vitest'
import { createStorage, defaultData, migrate, STORAGE_KEY } from '../../src/core/storage'

function fakeBackend() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }
}

describe('storage', () => {
  it('无数据时返回默认值', () => {
    const s = createStorage(fakeBackend())
    expect(s.load()).toEqual(defaultData())
  })
  it('保存后可读回', () => {
    const b = fakeBackend(); const s = createStorage(b)
    const d = defaultData(); d.profile.nickname = '小明'
    s.save(d)
    expect(createStorage(b).load().profile.nickname).toBe('小明')
  })
  it('后端抛错时退回内存并标记 persistent=false', () => {
    const bad = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => {} }
    const s = createStorage(bad)
    expect(s.persistent).toBe(false)
    const d = defaultData(); d.stickers.push('a'); s.save(d)
    expect(s.load().stickers).toEqual(['a'])
  })
  it('损坏的 JSON 会备份并重置', () => {
    const b = fakeBackend(); b.setItem(STORAGE_KEY, '{oops')
    const s = createStorage(b)
    expect(s.load()).toEqual(defaultData())
    expect([...b.m.keys()].some(k => k.startsWith(STORAGE_KEY + '.backup'))).toBe(true)
  })
  it('版本号不同会迁移并补齐缺失字段', () => {
    const b = fakeBackend(); b.setItem(STORAGE_KEY, JSON.stringify({ version: 0, stickers: ['x'] }))
    const d = createStorage(b).load()
    expect(d.version).toBe(2)
    expect(d.stickers).toEqual(['x'])
    expect(d.settings.dailyLimitMin).toBe(12)
  })
  it('默认数据为 v2 且新字段为空', () => {
    const d = defaultData()
    expect(d.version).toBe(2)
    expect(d.profile.birthMonth).toBeNull()
    expect(d.acuityTests).toEqual([]); expect(d.checklists).toEqual([])
    expect(d.observations).toEqual([]); expect(d.visits).toEqual([])
    expect(d.meta).toEqual({ lastBackupAt: null, persisted: null, lastBadgeStreak: 0 })
  })
  it('v1 数据迁移后保留 days、games、stickers，新字段为默认值', () => {
    const v1 = {
      version: 1,
      profile: { nickname: '小明', avatar: '🐼' },
      settings: { dailyLimitMin: 10, viewingDistanceMm: 350, recheckDate: '2026-12-01', breakEveryMin: 5 },
      calibration: { pxPerMm: 6.2 },
      games: { g1: { staircase: null, history: [{ date: '2026-10-01', levelEnd: 3, trials: 10, correct: 8 }] } },
      days: { '2026-10-01': { glassesOn: true, secondsTrained: 300, gamesPlayed: ['g1'], plan: ['g1'] } },
      stickers: ['🌟', '🍓'],
    }
    const d = migrate(JSON.parse(JSON.stringify(v1)))
    expect(d.version).toBe(2)
    expect(d.days).toEqual(v1.days)
    expect(d.games).toEqual(v1.games)
    expect(d.stickers).toEqual(v1.stickers)
    expect(d.settings).toEqual(v1.settings)
    expect(d.calibration.pxPerMm).toBe(6.2)
    expect(d.profile).toEqual({ nickname: '小明', avatar: '🐼', birthMonth: null })
    expect(d.days['2026-10-01'].wear).toBeUndefined()
    expect(d.acuityTests).toEqual([]); expect(d.checklists).toEqual([])
    expect(d.observations).toEqual([]); expect(d.visits).toEqual([])
    expect(d.meta).toEqual({ lastBackupAt: null, persisted: null, lastBadgeStreak: 0 })
  })
  it('profile.birthMonth 缺失时为 null', () => {
    expect(migrate({ version: 1, profile: { nickname: 'a', avatar: 'b' } }).profile.birthMonth).toBeNull()
    expect(migrate({}).profile.birthMonth).toBeNull()
  })
  it('v2 数据原样保留，meta 缺字段时补齐', () => {
    const d = defaultData()
    d.profile.birthMonth = '2022-05'
    d.visits.push({ id: 'v', date: '2026-09-01', hospital: '', cycloplegic: true,
      od: { sph: 7, cyl: 0, axis: 0, va: 0.5 }, os: { sph: 7, cyl: 0, axis: 0, va: 0.5 },
      eyePosition: 'normal', newGlasses: false, advice: '', nextDate: '2027-03-01' })
    d.days['2026-10-01'] = { glassesOn: true, secondsTrained: 0, gamesPlayed: [], plan: [], wear: 'most' }
    const raw = JSON.parse(JSON.stringify(d)); raw.meta = { lastBackupAt: '2026-10-01' }
    const m = migrate(raw)
    expect(m.profile.birthMonth).toBe('2022-05')
    expect(m.visits).toEqual(d.visits)
    expect(m.days['2026-10-01'].wear).toBe('most')
    expect(m.meta).toEqual({ lastBackupAt: '2026-10-01', persisted: null, lastBadgeStreak: 0 })
  })
  it('非数组的新字段被重置为空数组', () => {
    expect(migrate({ acuityTests: 'x', visits: null }).acuityTests).toEqual([])
  })
})
