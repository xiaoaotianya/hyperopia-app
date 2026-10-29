import { describe, it, expect } from 'vitest'
import { CHECK_ITEMS, checklistFindings } from '../../src/core/checklist'
import type { Checklist, Freq } from '../../src/core/storage'

const c = (answers: Record<string, Freq>): Checklist => ({ id: 'x', date: '2026-10-29', answers, note: '' })

describe('checklist', () => {
  it('8 项，顺序与重点项', () => {
    expect(CHECK_ITEMS.map(i => i.id)).toEqual(['eso-off', 'eso-on', 'squint', 'rub', 'close', 'one-eye', 'refuse', 'clumsy'])
    expect(CHECK_ITEMS.filter(i => i.key).map(i => i.id)).toEqual(['eso-off', 'eso-on', 'one-eye'])
    expect(CHECK_ITEMS.every(i => i.text.length > 0)).toBe(true)
  })
  it('全部"没有"或未作答 → 无发现', () => {
    expect(checklistFindings(c({}))).toEqual({ key: [], often: [] })
    expect(checklistFindings(c(Object.fromEntries(CHECK_ITEMS.map(i => [i.id, 'no']))))).toEqual({ key: [], often: [] })
  })
  it('重点项"有时"或"经常"进入 key', () => {
    expect(checklistFindings(c({ 'one-eye': 'sometimes', 'eso-off': 'often', 'eso-on': 'no' }))).toEqual({ key: ['eso-off', 'one-eye'], often: [] })
  })
  it('非重点项只有"经常"进入 often，"有时"不算', () => {
    expect(checklistFindings(c({ clumsy: 'often', squint: 'often', rub: 'sometimes' }))).toEqual({ key: [], often: ['squint', 'clumsy'] })
  })
  it('未知 id 被忽略', () => {
    expect(checklistFindings(c({ foo: 'often' }))).toEqual({ key: [], often: [] })
  })
})
