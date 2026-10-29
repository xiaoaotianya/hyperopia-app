import { describe, it, expect } from 'vitest'
import {
  addMonths, draftFromVisit, emptyDraft, fmtDiopter, fmtRx, newId, rxChange, sortVisitsDesc, validateVisit,
  type VisitDraft,
} from '../../src/core/visits'
import type { Visit } from '../../src/core/storage'

const TODAY = '2026-10-29'
const visit = (date: string, odSph: number, osSph = odSph, odCyl = 0, id = date): Visit => ({
  id, date, hospital: '', cycloplegic: true,
  od: { sph: odSph, cyl: odCyl, axis: odCyl ? 180 : 0, va: 0.5 }, os: { sph: osSph, cyl: 0, axis: 0, va: null },
  eyePosition: 'normal', newGlasses: false, advice: '', nextDate: '2027-04-29',
})
const draft = (patch: Partial<VisitDraft> = {}): VisitDraft => ({
  ...emptyDraft(TODAY),
  od: { sph: 7, cyl: -0.75, axis: 180, va: 0.5 },
  os: { sph: '6.50', cyl: '', axis: '', va: '' },
  ...patch,
})

describe('addMonths', () => {
  it('普通、跨年、月末', () => {
    expect(addMonths('2026-10-29', 3)).toBe('2027-01-29')
    expect(addMonths('2026-10-29', 6)).toBe('2027-04-29')
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28')
    expect(addMonths('2027-11-30', 3)).toBe('2028-02-29')
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(addMonths('2026-01-15', -3)).toBe('2025-10-15')
  })
})

describe('格式化', () => {
  it('度数带正负号', () => {
    expect(fmtDiopter(7)).toBe('+7.00')
    expect(fmtDiopter(-0.75)).toBe('-0.75')
    expect(fmtDiopter(0)).toBe('0.00')
    expect(fmtDiopter(-0)).toBe('0.00')
  })
  it('处方简写', () => {
    expect(fmtRx({ sph: 7, cyl: -0.75, axis: 180, va: null })).toBe('+7.00 / -0.75 × 180')
    expect(fmtRx({ sph: 6.5, cyl: 0, axis: 0, va: null })).toBe('+6.50 DS')
  })
  it('id 格式', () => {
    expect(newId()).toMatch(/^[0-9a-z]{9,}$/)
    expect(newId()).not.toBe(newId())
  })
})

describe('sortVisitsDesc', () => {
  it('按日期倒序，不修改原数组', () => {
    const list = [visit('2026-01-01', 7), visit('2026-07-01', 6.5), visit('2026-04-01', 7)]
    expect(sortVisitsDesc(list).map(v => v.date)).toEqual(['2026-07-01', '2026-04-01', '2026-01-01'])
    expect(list[0].date).toBe('2026-01-01')
  })
})

describe('rxChange', () => {
  it('没有上一次 → null', () => {
    expect(rxChange(visit('2026-07-01', 7), undefined)).toBeNull()
  })
  it('变化 0.25 不高亮，0.50 高亮（球镜或柱镜、任一眼）', () => {
    expect(rxChange(visit('2026-07-01', 6.75), visit('2026-01-01', 7))!.significant).toBe(false)
    const c = rxChange(visit('2026-07-01', 6.5), visit('2026-01-01', 7))!
    expect(c.significant).toBe(true)
    expect(c.od.sph).toBe(-0.5)
    expect(rxChange(visit('2026-07-01', 7, 7.5), visit('2026-01-01', 7))!.significant).toBe(true)
    const cyl = rxChange(visit('2026-07-01', 7, 7, -1), visit('2026-01-01', 7, 7, -0.5))!
    expect(cyl.significant).toBe(true)
    expect(cyl.od.cyl).toBe(-0.5)
  })
  it('浮点误差不影响判断', () => {
    expect(rxChange(visit('b', 0.3 + 0.2), visit('a', 0))!.significant).toBe(true)
    expect(rxChange(visit('b', 0.1 + 0.2 + 0.15), visit('a', 0))!.significant).toBe(false)
  })
})

describe('validateVisit', () => {
  it('合法输入 → 解析为数字，柱镜为空记 0、轴位记 0', () => {
    const r = validateVisit(draft({ hospital: '  市眼科  ' }), TODAY)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.visit.od).toEqual({ sph: 7, cyl: -0.75, axis: 180, va: 0.5 })
    expect(r.visit.os).toEqual({ sph: 6.5, cyl: 0, axis: 0, va: null })
    expect(r.visit.hospital).toBe('市眼科')
    expect(r.visit.nextDate).toBe('2027-04-29')
  })
  it('"+7.25" 这种带加号的文本也能解析', () => {
    const r = validateVisit(draft({ os: { sph: '+7.25', cyl: '', axis: '', va: '' } }), TODAY)
    expect(r.ok && r.visit.os.sph).toBe(7.25)
  })
  it('必填项', () => {
    const r = validateVisit(draft({ date: '', nextDate: '', os: { sph: '', cyl: '', axis: '', va: '' } }), TODAY)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(Object.keys(r.errors).sort()).toEqual(['date', 'nextDate', 'os.sph'])
  })
  it('复查日期不能晚于今天，今天可以', () => {
    expect(validateVisit(draft({ date: TODAY }), TODAY).ok).toBe(true)
    const r = validateVisit(draft({ date: '2026-10-30' }), TODAY)
    expect(!r.ok && r.errors.date).toContain('不能晚于今天')
  })
  it('下次复查日期可以在将来，但要晚于本次', () => {
    expect(validateVisit(draft({ nextDate: '2030-01-01' }), TODAY).ok).toBe(true)
    const r = validateVisit(draft({ date: '2026-10-01', nextDate: '2026-10-01' }), TODAY)
    expect(!r.ok && r.errors.nextDate).toBeTruthy()
  })
  it('日期格式', () => {
    const r = validateVisit(draft({ date: '2026-02-30' }), TODAY)
    expect(!r.ok && r.errors.date).toBe('日期格式不正确')
  })
  it('球镜范围 ±20 边界', () => {
    const sph = (v: number) => validateVisit(draft({ od: { sph: v, cyl: '', axis: '', va: '' } }), TODAY)
    expect(sph(20).ok).toBe(true)
    expect(sph(-20).ok).toBe(true)
    const r = sph(20.25)
    expect(!r.ok && r.errors['od.sph']).toContain('请检查输入')
    expect(sph(-21).ok).toBe(false)
  })
  it('度数须为 0.25 的倍数', () => {
    const r = validateVisit(draft({ od: { sph: 7.1, cyl: '', axis: '', va: '' } }), TODAY)
    expect(!r.ok && r.errors['od.sph']).toContain('0.25')
  })
  it('柱镜 ±6，非零柱镜需要轴位，轴位 0–180 整数', () => {
    const e = (cyl: string | number, axis: string | number) =>
      validateVisit(draft({ od: { sph: 7, cyl, axis, va: '' } }), TODAY)
    expect(e(6, 90).ok).toBe(true)
    expect(e(-6.25, 90).ok).toBe(false)
    const r = e(-1, '')
    expect(!r.ok && r.errors['od.axis']).toContain('轴位')
    expect(e(-1, 0).ok).toBe(true)
    expect(e(-1, 181).ok).toBe(false)
    expect(e(-1, 90.5).ok).toBe(false)
    // 柱镜为 0 时轴位不必填，填了也记为 0
    const z = e(0, '')
    expect(z.ok && z.visit.od.axis).toBe(0)
  })
  it('矫正视力 0.05–2.0，可不填', () => {
    const va = (v: string | number) => validateVisit(draft({ os: { sph: 7, cyl: '', axis: '', va: v } }), TODAY)
    expect(va('').ok).toBe(true)
    expect(va(0.05).ok).toBe(true)
    expect(va(2).ok).toBe(true)
    expect(va(0.04).ok).toBe(false)
    expect(va(2.1).ok).toBe(false)
    expect(va('abc').ok).toBe(false)
  })
  it('draftFromVisit 往返', () => {
    const v = visit('2026-07-01', 7, 6.5, -0.75)
    const r = validateVisit(draftFromVisit(v), TODAY)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect({ ...r.visit, id: v.id }).toEqual(v)
  })
})
