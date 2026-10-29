import { describe, it, expect, beforeEach } from 'vitest'
import { router } from '../../src/router'
import { store, today } from '../../src/core/store'
import { defaultData } from '../../src/core/storage'
import { clearParentOk, markParentOk } from '../../src/core/parentAuth'

describe('router guards', () => {
  beforeEach(async () => {
    Object.assign(store, defaultData())
    clearParentOk()
    await router.push('/stickers')
  })

  it('/play：没确认戴镜时回首页', async () => {
    await router.push('/play/any')
    expect(router.currentRoute.value.path).toBe('/')
  })
  it('/play：时长用完时去 /done', async () => {
    today().glassesOn = true
    today().secondsTrained = store.settings.dailyLimitMin * 60
    await router.push('/play/any')
    expect(router.currentRoute.value.path).toBe('/done')
  })
  it('/play：未知游戏回 /today', async () => {
    today().glassesOn = true
    await router.push('/play/nope')
    expect(router.currentRoute.value.path).toBe('/today')
  })
  it('/parent/*：未过家长门时回 /parent 并带上 next', async () => {
    await router.push('/parent/settings')
    expect(router.currentRoute.value.path).toBe('/parent')
    expect(router.currentRoute.value.query.next).toBe('/parent/settings')
    markParentOk()
    await router.push('/parent/settings')
    expect(router.currentRoute.value.path).toBe('/parent/settings')
  })
})
