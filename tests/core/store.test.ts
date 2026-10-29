import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'
import { replaceStore } from '../../src/core/store'
import { defaultData } from '../../src/core/storage'

describe('replaceStore', () => {
  it('覆盖全部内容，且保留原有对象/数组引用', () => {
    const s = reactive(defaultData())
    s.days['2026-10-01'] = { glassesOn: true, secondsTrained: 60, gamesPlayed: [], plan: [] }
    s.stickers.push('🌟', '🍓')
    s.profile.nickname = '旧'
    const days = s.days, stickers = s.stickers, profile = s.profile

    const next = defaultData()
    next.days['2026-10-20'] = { glassesOn: false, secondsTrained: 0, gamesPlayed: [], plan: [], wear: 'full' }
    next.stickers.push('👓🏅3')
    next.profile.nickname = '新'
    next.settings.recheckDate = '2027-01-01'
    replaceStore(next, s)

    expect(s.days).toBe(days); expect(s.stickers).toBe(stickers); expect(s.profile).toBe(profile)
    expect(Object.keys(s.days)).toEqual(['2026-10-20'])
    expect(s.stickers).toEqual(['👓🏅3'])
    expect(s.profile.nickname).toBe('新')
    expect(s.settings.recheckDate).toBe('2027-01-01')
    expect(JSON.parse(JSON.stringify(s))).toEqual(JSON.parse(JSON.stringify(next)))
  })
})
