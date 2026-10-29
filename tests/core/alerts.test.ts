import { describe, it, expect } from 'vitest'
import { computeAlerts } from '../../src/core/alerts'
import { defaultData, type AppData, type AcuityTest, type Visit, type WearLevel, type Freq } from '../../src/core/storage'
import { addDays } from '../../src/core/date'

const TODAY = '2026-10-29'
const ENV = { persistent: true, speech: true }

/** 一份"什么提醒都没有"的数据 */
function clean(): AppData {
  const d = defaultData()
  d.calibration.pxPerMm = 6
  d.meta.lastBackupAt = TODAY
  for (let i = 0; i < 7; i++) d.days[addDays(TODAY, -i)] = { glassesOn: true, secondsTrained: 0, gamesPlayed: [], plan: [], wear: 'full' }
  d.acuityTests.push(test(TODAY, []))
  d.checklists.push({ id: 'c', date: TODAY, answers: {}, note: '' })
  return d
}
function test(date: string, flags: AcuityTest['flags']): AcuityTest {
  return { id: date, date, ageMonths: 50, distanceMm: 400, pxPerMm: 6, bestMeasurableLogmar: 0,
    od: { logmar: 0.2, trials: [] }, os: { logmar: 0.2, trials: [] }, flags }
}
function visit(date: string, nextDate: string): Visit {
  const rx = { sph: 7, cyl: 0, axis: 0, va: 0.5 }
  return { id: date, date, hospital: '', cycloplegic: true, od: rx, os: rx, eyePosition: 'normal', newGlasses: false, advice: '', nextDate }
}
const ids = (d: AppData, env = ENV, today = TODAY) => computeAlerts(d, today, env).map(a => a.id)

describe('computeAlerts', () => {
  it('数据齐全且正常时没有提醒', () => {
    expect(computeAlerts(clean(), TODAY, ENV)).toEqual([])
  })

  describe('复查', () => {
    it('没有复查日期时不提醒', () => {
      expect(ids(clean())).not.toContain('recheck-overdue')
      expect(ids(clean())).not.toContain('recheck-soon')
    })
    it('已过期 → 红色；当天 → 黄色', () => {
      const d = clean(); d.settings.recheckDate = addDays(TODAY, -1)
      const a = computeAlerts(d, TODAY, ENV)
      expect(a[0]).toMatchObject({ id: 'recheck-overdue', level: 'red', to: '/parent/visits' })
      d.settings.recheckDate = TODAY
      expect(computeAlerts(d, TODAY, ENV)[0]).toMatchObject({ id: 'recheck-soon', level: 'yellow', to: '/parent/visits' })
    })
    it('14 天内 → 黄色；15 天不提醒', () => {
      const d = clean(); d.settings.recheckDate = addDays(TODAY, 14)
      expect(ids(d)).toEqual(['recheck-soon'])
      d.settings.recheckDate = addDays(TODAY, 15)
      expect(ids(d)).toEqual([])
    })
    it('有复查记录时取最近一条的 nextDate，忽略 settings.recheckDate', () => {
      const d = clean()
      d.settings.recheckDate = addDays(TODAY, -100)
      d.visits.push(visit('2026-09-01', addDays(TODAY, 60)), visit('2026-04-01', addDays(TODAY, -5)))
      expect(ids(d)).toEqual([])
      d.visits.push(visit('2026-10-01', addDays(TODAY, 3)))
      expect(ids(d)).toEqual(['recheck-soon'])
    })
  })

  describe('视力自测', () => {
    it('14 天内连续两次异常 → 红色', () => {
      const d = clean()
      d.acuityTests = [test('2026-10-10', ['interocular']), test('2026-10-20', ['below-age'])]
      expect(computeAlerts(d, TODAY, ENV)).toEqual([expect.objectContaining({ id: 'acuity-doctor', level: 'red', to: '/parent/acuity' })])
    })
    it('只有一次异常时不进红色提醒', () => {
      const d = clean()
      d.acuityTests = [test('2026-10-10', []), test('2026-10-20', ['below-age'])]
      expect(ids(d)).not.toContain('acuity-doctor')
    })
    it('超过 28 天没做 → 灰色；正好 28 天不提醒', () => {
      const d = clean()
      d.acuityTests = [test(addDays(TODAY, -28), [])]
      expect(ids(d)).toEqual([])
      d.acuityTests = [test(addDays(TODAY, -29), [])]
      expect(computeAlerts(d, TODAY, ENV)).toEqual([expect.objectContaining({ id: 'acuity-due', level: 'gray', to: '/parent/acuity' })])
    })
    it('最近一次异常但不满足就医条件 → 黄色 acuity-retest', () => {
      const d = clean()
      d.acuityTests = [test('2026-10-01', []), test(TODAY, ['interocular'])]
      expect(computeAlerts(d, TODAY, ENV)).toEqual([expect.objectContaining({ id: 'acuity-retest', level: 'yellow', to: '/parent/acuity' })])
      expect(computeAlerts(d, TODAY, ENV)[0].text).toContain('1 周内重测')
    })
    it('两次异常相隔超过 14 天 → 只提醒重测', () => {
      const d = clean()
      d.acuityTests = [test('2026-10-01', ['decline']), test(TODAY, ['below-age'])]
      expect(ids(d)).toEqual(['acuity-retest'])
    })
    it('see-doctor 时不再出现 acuity-retest', () => {
      const d = clean()
      d.acuityTests = [test('2026-10-20', ['interocular']), test(TODAY, ['below-age'])]
      expect(ids(d)).toEqual(['acuity-doctor'])
    })
    it('acuity-retest 排在 recheck-soon 之后、wear-low 之前', () => {
      const d = clean()
      d.settings.recheckDate = addDays(TODAY, 3)
      d.acuityTests = [test(TODAY, ['interocular'])]
      for (let i = 0; i < 7; i++) d.days[addDays(TODAY, -i)].wear = 'none'
      expect(ids(d)).toEqual(['recheck-soon', 'acuity-retest', 'wear-low'])
    })
    it('从未做过 → 灰色', () => {
      const d = clean(); d.acuityTests = []
      expect(ids(d)).toEqual(['acuity-due'])
    })
  })

  describe('观察清单', () => {
    const withAnswers = (date: string, answers: Record<string, Freq>) => {
      const d = clean(); d.checklists = [{ id: 'x', date, answers, note: '' }]; return d
    }
    it('重点项为"有时"或"经常" → 红色', () => {
      for (const id of ['eso-off', 'eso-on', 'one-eye']) {
        for (const f of ['sometimes', 'often'] as Freq[]) {
          const a = computeAlerts(withAnswers(TODAY, { [id]: f }), TODAY, ENV)
          expect(a).toEqual([expect.objectContaining({ id: 'checklist-key', level: 'red', to: '/parent/observe' })])
        }
      }
    })
    it('重点项为"没有"或非重点项为"经常" → 不提醒', () => {
      expect(ids(withAnswers(TODAY, { 'eso-off': 'no', squint: 'often', rub: 'often' }))).toEqual([])
    })
    it('只看最近一份清单', () => {
      const d = withAnswers('2026-10-01', { 'eso-off': 'often' })
      d.checklists.push({ id: 'y', date: '2026-10-20', answers: { 'eso-off': 'no' }, note: '' })
      expect(ids(d)).toEqual([])
      d.checklists.reverse() // 与数组顺序无关
      expect(ids(d)).toEqual([])
    })
    it('重点信号的清单在 30 天内才提醒；超过 30 天转为"该做清单"', () => {
      expect(ids(withAnswers(addDays(TODAY, -30), { 'one-eye': 'sometimes' }))).toEqual(['checklist-key'])
      expect(ids(withAnswers(addDays(TODAY, -31), { 'one-eye': 'sometimes' }))).toEqual(['checklist-due'])
    })
    it('超过 30 天没做 → 灰色；正好 30 天不提醒；从未做过 → 灰色', () => {
      expect(ids(withAnswers(addDays(TODAY, -30), {}))).toEqual([])
      const a = computeAlerts(withAnswers(addDays(TODAY, -31), {}), TODAY, ENV)
      expect(a).toEqual([expect.objectContaining({ id: 'checklist-due', level: 'gray', to: '/parent/observe' })])
      const d = clean(); d.checklists = []
      expect(ids(d)).toEqual(['checklist-due'])
    })
  })

  describe('戴镜', () => {
    const setWear = (d: AppData, ws: (WearLevel | undefined)[]) => {
      d.days = {}
      ws.forEach((w, i) => { d.days[addDays(TODAY, -i)] = { glassesOn: false, secondsTrained: 0, gamesPlayed: [], plan: [], ...(w ? { wear: w } : {}) } })
    }
    it('近 7 天达标 5 天不提醒，4 天 → 黄色', () => {
      const d = clean()
      setWear(d, ['full', 'most', 'full', 'full', 'most', 'less', 'none'])
      expect(ids(d)).toEqual([])
      setWear(d, ['full', 'most', 'full', 'less', 'most', undefined, 'none', 'full', 'full'])
      expect(computeAlerts(d, TODAY, ENV)).toEqual([expect.objectContaining({ id: 'wear-low', level: 'yellow', to: '/parent/checkin' })])
    })
    it('戴镜记录不足 7 天跨度时不提醒', () => {
      const d = clean()
      d.days = {}
      expect(ids(d)).toEqual([])
      // 最早记录在 5 天前（跨度 6 天）→ 不提醒
      setWear(d, ['none', undefined, undefined, undefined, undefined, 'less'])
      expect(ids(d)).toEqual([])
      // 最早记录在 6 天前（跨度 7 天）→ 提醒
      setWear(d, ['none', undefined, undefined, undefined, undefined, undefined, 'less'])
      expect(ids(d)).toEqual(['wear-low'])
    })
    it('只有训练记录、没有 wear 的日子不计入跨度', () => {
      const d = clean()
      setWear(d, ['none', undefined, undefined, undefined, undefined, undefined, undefined, undefined])
      expect(ids(d)).toEqual([])
    })
  })

  describe('备份', () => {
    it('30 天不提醒，31 天 → 灰色，从未备份 → 灰色', () => {
      const d = clean()
      d.meta.lastBackupAt = addDays(TODAY, -30)
      expect(ids(d)).toEqual([])
      d.meta.lastBackupAt = addDays(TODAY, -31)
      expect(computeAlerts(d, TODAY, ENV)).toEqual([expect.objectContaining({ id: 'backup-due', level: 'gray', to: '/parent/settings' })])
      d.meta.lastBackupAt = null
      expect(ids(d)).toEqual(['backup-due'])
    })
    it('lastBackupAt 为 ISO 时间戳也可识别', () => {
      const d = clean(); d.meta.lastBackupAt = `${addDays(TODAY, -2)}T10:00:00.000Z`
      expect(ids(d)).toEqual([])
    })
  })

  describe('校准与环境', () => {
    it('未校准 → 灰色', () => {
      const d = clean(); d.calibration.pxPerMm = null
      expect(computeAlerts(d, TODAY, ENV)).toEqual([expect.objectContaining({ id: 'calibration', level: 'gray', to: '/parent/calibration' })])
    })
    it('存储不可用、语音不可用 → 灰色', () => {
      expect(ids(clean(), { persistent: false, speech: true })).toEqual(['storage'])
      expect(ids(clean(), { persistent: true, speech: false })).toEqual(['speech'])
    })
  })

  it('按 red、yellow、gray 排序；文案不含诊断词', () => {
    const d = defaultData()
    d.settings.recheckDate = addDays(TODAY, -3)
    d.days[addDays(TODAY, -6)] = { glassesOn: false, secondsTrained: 0, gamesPlayed: [], plan: [], wear: 'none' }
    d.acuityTests = [test('2026-10-10', ['interocular']), test('2026-10-20', ['decline'])]
    d.checklists = [{ id: 'x', date: TODAY, answers: { 'eso-on': 'often' }, note: '' }]
    const a = computeAlerts(d, TODAY, { persistent: false, speech: false })
    const order = { red: 0, yellow: 1, gray: 2 }
    expect(a.map(x => order[x.level])).toEqual([...a.map(x => order[x.level])].sort())
    expect(a.map(x => x.id)).toEqual(['recheck-overdue', 'acuity-doctor', 'checklist-key', 'wear-low',
      'backup-due', 'calibration', 'storage', 'speech'])
    for (const x of a) {
      expect(x.text.length).toBeGreaterThan(0)
      expect(x.text).not.toMatch(/弱视|斜视|确诊|诊断|患有/)
    }
  })
})
