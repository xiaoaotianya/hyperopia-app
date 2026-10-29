import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import App from '../../src/App.vue'
import WearPicker from '../../src/components/WearPicker.vue'
import GlassesTree from '../../src/components/GlassesTree.vue'
import { router } from '../../src/router'
import { store, replaceStore } from '../../src/core/store'
import { defaultData } from '../../src/core/storage'
import { addDays, todayKey } from '../../src/core/date'
import { markParentOk } from '../../src/core/parentAuth'

async function render(path: string) {
  await router.push(path)
  await router.isReady()
  const w = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('Batch 2 界面', () => {
  beforeEach(() => { replaceStore(defaultData()); markParentOk() })

  it('WearPicker 点击后写入档位，记录不存在时先创建', async () => {
    const date = '2026-10-20'
    const w = mount(WearPicker, { props: { date } })
    expect(store.days[date]).toBeUndefined()
    await w.find('[data-level="most"]').trigger('click')
    expect(store.days[date]).toMatchObject({ wear: 'most', glassesOn: false, secondsTrained: 0 })
    expect(w.find('[data-level="most"]').classes()).toContain('sel')
    expect(w.emitted('change')?.[0]).toEqual(['most'])
    await w.find('[data-level="none"]').trigger('click')
    expect(store.days[date].wear).toBe('none')
    expect(w.find('[data-level="most"]').classes()).not.toContain('sel')
  })

  it('WearPicker 保留当天已有的训练记录', async () => {
    const date = '2026-10-21'
    store.days[date] = { glassesOn: true, secondsTrained: 300, gamesPlayed: ['x'], plan: [] }
    const w = mount(WearPicker, { props: { date } })
    await w.find('[data-level="full"]').trigger('click')
    expect(store.days[date]).toMatchObject({ wear: 'full', glassesOn: true, secondsTrained: 300, gamesPlayed: ['x'] })
  })

  it('ParentHome 在空数据下渲染仪表盘并显示提醒与新菜单', async () => {
    const w = await render('/parent')
    const t = w.text()
    expect(t).toContain('今天戴镜情况')
    expect(w.findAll('[data-level]').length).toBe(4)
    // 空数据：从未自测、从未填清单、从未备份、未校准
    for (const id of ['acuity-due', 'checklist-due', 'backup-due', 'calibration'])
      expect(w.find(`[data-alert="${id}"]`).exists()).toBe(true)
    expect(w.find('[data-alert="wear-low"]').exists()).toBe(false)
    for (const label of ['视力自测', '观察记录', '复查档案', '医生报告', '戴镜打卡', '训练进度', '设置', '屏幕校准', '使用声明'])
      expect(t).toContain(label)
    expect(t).toContain('还没有测过')
    expect(t).toContain('未设置')
    w.unmount()
  })

  it('ParentHome 概览显示最近自测（小数视力）与连续达标', async () => {
    const today = todayKey()
    for (let i = 0; i < 3; i++) store.days[addDays(today, -i)] = { glassesOn: true, secondsTrained: 600, gamesPlayed: [], plan: [], wear: 'full' }
    store.acuityTests.push({ id: 't', date: today, ageMonths: null, distanceMm: 400, pxPerMm: 6, bestMeasurableLogmar: 0,
      od: { logmar: 0.3, trials: [] }, os: { logmar: null, trials: [] }, flags: [] })
    const w = await render('/parent')
    const t = w.text()
    expect(t).toMatch(/右眼\s*0\.5/)
    expect(t).toMatch(/左眼\s*<0\.1/)
    expect(t).toMatch(/连续戴镜达标\s*3\s*天/)
    expect(t).toMatch(/30\s*分钟/)
    w.unmount()
  })

  it('ParentHome 点提醒"去处理"跳到对应页面', async () => {
    const w = await render('/parent')
    await w.find('[data-alert="calibration"] .go').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/parent/calibration'), { timeout: 3000 })
    w.unmount()
  })

  it('KidHome 连续达标跨过里程碑时发贴纸，且不重复发放', async () => {
    const today = todayKey()
    for (let i = 0; i < 7; i++) store.days[addDays(today, -i)] = { glassesOn: false, secondsTrained: 0, gamesPlayed: [], plan: [], wear: 'most' }
    let w = await render('/')
    expect(store.stickers).toEqual(['👓🏅3', '👓🏅7'])
    expect(store.meta.lastBadgeStreak).toBe(7)
    w.unmount()
    w = await render('/stickers')
    expect(w.text()).toContain('👓 7')
    await router.push('/')
    await flushPromises()
    expect(store.stickers).toEqual(['👓🏅3', '👓🏅7'])
    w.unmount()
  })

  it('KidHome 断档后 lastBadgeStreak 回落', async () => {
    store.meta.lastBadgeStreak = 7
    const w = await render('/')
    expect(store.meta.lastBadgeStreak).toBe(0)
    expect(store.stickers).toEqual([])
    w.unmount()
  })

  it('GlassesTree 按 treeState 画叶、花、果', () => {
    const w = mount(GlassesTree, { props: { leaves: 31, flowers: 4, fruits: 1, growFrom: 29 } })
    expect(w.attributes('aria-label')).toContain('31 片叶子')
    expect(w.findAll('.grow').length).toBe(2)
    const empty = mount(GlassesTree, { props: { leaves: 0, flowers: 0, fruits: 0 } })
    expect(empty.findAll('.grow').length).toBe(0)
  })

  it('Checkin 点最近 7 天内的日期弹出补录，更早的日期不可点', async () => {
    const w = await render('/parent/checkin')
    const todayCell = w.find('.cell.today')
    await todayCell.trigger('click')
    expect(w.find('.sheet').exists()).toBe(true)
    await w.find('.sheet [data-level="full"]').trigger('click')
    expect(store.days[todayKey()].wear).toBe('full')
    expect(w.find('.sheet').exists()).toBe(false)
    expect(w.find('.cell.today').classes()).toContain('full')
    expect(w.findAll('.cell:not(.blank):not(.editable)').every(c => c.attributes('disabled') !== undefined)).toBe(true)
    w.unmount()
  })

  it('Settings 从备份恢复：预览摘要，确认后覆盖；无效文件不改动', async () => {
    store.stickers.push('🌟')
    const w = await render('/parent/settings')
    const input = w.find('input[type="file"]')
    const choose = async (text: string) => {
      Object.defineProperty(input.element, 'files', { configurable: true, value: [new File([text], 'b.json', { type: 'application/json' })] })
      await input.trigger('change')
      await vi.waitFor(() => expect(w.text()).toMatch(/确认从这个备份恢复|不是有效的备份文件/))
    }
    await choose('{"hello": 1}')
    expect(w.text()).toContain('不是有效的备份文件')
    expect(store.stickers).toEqual(['🌟'])

    const backup = defaultData()
    backup.days['2026-01-01'] = { glassesOn: true, secondsTrained: 0, gamesPlayed: [], plan: [], wear: 'full' }
    backup.stickers = ['🍓', '🐳']
    backup.meta.lastBackupAt = '2026-01-02'
    await choose(JSON.stringify(backup))
    expect(w.text()).toContain('2026-01-02')
    expect(w.text()).toMatch(/每日记录 1 天/)
    expect(store.stickers).toEqual(['🌟'])
    const btn = w.findAll('button').find(b => b.text() === '确认恢复')!
    await btn.trigger('click')
    expect(store.stickers).toEqual(['🍓', '🐳'])
    expect(Object.keys(store.days)).toContain('2026-01-01')
    expect(w.text()).toContain('已从备份恢复')
    w.unmount()
  })
})
