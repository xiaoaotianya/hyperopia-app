import { describe, it, expect, afterEach, vi } from 'vitest'
import { backupFilename, parseBackup, requestPersist } from '../../src/core/backup'
import { defaultData } from '../../src/core/storage'

describe('backup', () => {
  it('文件名', () => {
    expect(backupFilename('2026-10-29')).toBe('视觉乐园备份-2026-10-29.json')
  })
  it('v1 备份：迁移为 v2，summary 计数正确', () => {
    const v1 = {
      version: 1, profile: { nickname: '小明', avatar: '🐼' },
      days: { '2026-10-01': { glassesOn: true, secondsTrained: 60, gamesPlayed: [], plan: [] }, '2026-10-02': { glassesOn: false, secondsTrained: 0, gamesPlayed: [], plan: [] } },
      games: {}, stickers: ['🌟', '🍓', '🐳'],
    }
    const r = parseBackup(JSON.stringify(v1))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.version).toBe(2)
    expect(r.data.profile).toEqual({ nickname: '小明', avatar: '🐼', birthMonth: null })
    expect(r.data.days).toEqual(v1.days)
    expect(r.data.meta).toEqual({ lastBackupAt: null, persisted: null, lastBadgeStreak: 0 })
    expect(r.summary).toEqual({ days: 2, tests: 0, visits: 0, stickers: 3 })
  })
  it('v2 备份：原样保留并计数', () => {
    const d = defaultData()
    d.stickers.push('🌟')
    d.acuityTests.push({ id: 't', date: '2026-10-01', ageMonths: 50, distanceMm: 400, pxPerMm: 6, bestMeasurableLogmar: 0,
      od: { logmar: 0.2, trials: [] }, os: { logmar: null, trials: [] }, flags: ['interocular'] })
    const rx = { sph: 7, cyl: -0.5, axis: 180, va: 0.5 }
    d.visits.push({ id: 'v', date: '2026-09-01', hospital: 'A', cycloplegic: true, od: rx, os: rx, eyePosition: 'normal', newGlasses: false, advice: '', nextDate: '2027-03-01' })
    d.meta.lastBadgeStreak = 7
    const r = parseBackup(JSON.stringify(d))
    expect(r).toEqual({ ok: true, data: d, summary: { days: 0, tests: 1, visits: 1, stickers: 1 } })
  })
  it('只含 stickers 也算有效', () => {
    expect(parseBackup('{"stickers":[]}').ok).toBe(true)
  })
  it('无效 JSON', () => {
    const r = parseBackup('{oops')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('不是有效的备份文件')
  })
  it('不相关的 JSON', () => {
    for (const t of ['{"foo":1}', '[]', '[{"days":{}}]', 'null', '42', '"days"', '{}'])
      expect(parseBackup(t).ok).toBe(false)
  })
})

describe('requestPersist', () => {
  const orig = Object.getOwnPropertyDescriptor(navigator, 'storage')
  const setStorage = (v: unknown) => Object.defineProperty(navigator, 'storage', { value: v, configurable: true })
  afterEach(() => { if (orig) Object.defineProperty(navigator, 'storage', orig); else delete (navigator as { storage?: unknown }).storage })

  it('浏览器不支持时返回 null', async () => {
    setStorage(undefined)
    expect(await requestPersist()).toBeNull()
    setStorage({})
    expect(await requestPersist()).toBeNull()
  })
  it('返回 persist() 的结果', async () => {
    const persist = vi.fn(async () => true)
    setStorage({ persist })
    expect(await requestPersist()).toBe(true)
    setStorage({ persist: async () => false })
    expect(await requestPersist()).toBe(false)
  })
  it('persist() 抛错时返回 false', async () => {
    setStorage({ persist: async () => { throw new Error('x') } })
    expect(await requestPersist()).toBe(false)
  })
})
