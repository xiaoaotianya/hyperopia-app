import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Component } from 'vue'
import Observe from '../../src/views/parent/Observe.vue'
import Visits from '../../src/views/parent/Visits.vue'
import Report from '../../src/views/parent/Report.vue'
import { store } from '../../src/core/store'
import { defaultData, type Visit } from '../../src/core/storage'
import { addDays, todayKey } from '../../src/core/date'
import { CHECK_ITEMS } from '../../src/core/checklist'
import * as ics from '../../src/core/ics'

const TODAY = todayKey()

async function render(c: Component) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
  await router.push('/parent/x')
  await router.isReady()
  const w = mount(c, { global: { plugins: [router] } })
  await flushPromises()
  return w
}
const btn = (w: VueWrapper, text: string) => {
  const b = w.findAll('button').find(x => x.text().includes(text))
  if (!b) throw new Error(`button not found: ${text}`)
  return b
}

const sampleVisit = (date: string, sph: number, id: string): Visit => ({
  id, date, hospital: '市儿童医院', cycloplegic: true,
  od: { sph, cyl: -0.75, axis: 180, va: 0.5 }, os: { sph: sph - 0.5, cyl: 0, axis: 0, va: 0.6 },
  eyePosition: 'normal', newGlasses: false, advice: '继续全天戴镜', nextDate: addDays(TODAY, 90),
})

beforeEach(() => { Object.assign(store, defaultData()) })
afterEach(() => { vi.restoreAllMocks() })

describe('Observe', () => {
  it('填完 8 项才能提交；有重点信号时提示咨询医生，经常项提示告诉医生', async () => {
    const w = await render(Observe)
    const submit = () => w.find('form.checklist button[type="submit"]')
    expect(submit().attributes('disabled')).toBeDefined()
    for (const it of CHECK_ITEMS) {
      const freq = it.id === 'eso-off' ? 'sometimes' : it.id === 'rub' ? 'often' : 'no'
      await w.find(`[data-item="${it.id}"][data-freq="${freq}"]`).trigger('click')
    }
    expect(submit().attributes('disabled')).toBeUndefined()
    await w.find('form.checklist').trigger('submit')
    expect(store.checklists).toHaveLength(1)
    const c = store.checklists[0]
    expect(c.date).toBe(TODAY)
    expect(c.answers['eso-off']).toBe('sometimes')
    expect(c.id).toMatch(/^[0-9a-z]+$/)
    expect(w.text()).toContain('建议近期咨询医生')
    expect(w.text()).toContain('复查时可以告诉医生')
    expect(w.text()).toContain('月度清单') // 时间线
  })

  it('没有发现时显示正常结果', async () => {
    const w = await render(Observe)
    for (const it of CHECK_ITEMS) await w.find(`[data-item="${it.id}"][data-freq="no"]`).trigger('click')
    await w.find('form.checklist').trigger('submit')
    expect(w.text()).toContain('没有发现明显的异常信号')
    expect(w.text()).not.toContain('建议近期咨询医生')
  })

  it('随时记录：多选加备注写入 observations；删除前确认', async () => {
    const w = await render(Observe)
    await btn(w, '我发现了异常').trigger('click')
    await btn(w, '眯眼').trigger('click')
    await w.find('form.quick textarea').setValue('看电视时眯眼')
    await w.find('form.quick').trigger('submit')
    expect(store.observations).toHaveLength(1)
    expect(store.observations[0]).toMatchObject({ date: TODAY, items: ['squint'], note: '看电视时眯眼' })
    expect(w.text()).toContain('看电视时眯眼')

    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    await w.find('.entry .del').trigger('click')
    expect(store.observations).toHaveLength(1)
    await w.find('.entry .del').trigger('click')
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(store.observations).toHaveLength(0)
  })

  it('眼位指引可以展开，含示意图和声明', async () => {
    const w = await render(Observe)
    expect(w.find('.guide').exists()).toBe(false)
    await btn(w, '怎么在家看眼位').trigger('click')
    expect(w.findAll('.guide svg').length).toBeGreaterThanOrEqual(5)
    expect(w.text()).toContain('不能代替医院的检查')
  })
})

describe('Visits', () => {
  it('新增一条记录，写入 store 并显示在当前处方和时间线', async () => {
    const w = await render(Visits)
    expect(w.text()).toContain('还没有复查记录')
    await btn(w, '新增复查记录').trigger('click')
    await w.find('input[name="hospital"]').setValue('市儿童医院')
    await w.find('input[name="od.sph"]').setValue('7')
    await w.find('input[name="od.cyl"]').setValue('0.75')
    await w.find('button[aria-label="右眼 OD柱镜切换正负号"]').trigger('click')
    await w.find('input[name="od.axis"]').setValue('180')
    await w.find('input[name="od.va"]').setValue('0.5')
    await w.find('input[name="os.sph"]').setValue('6.5')
    await btn(w, '3 个月后').trigger('click')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(store.visits).toHaveLength(1)
    const v = store.visits[0]
    expect(v).toMatchObject({ date: TODAY, hospital: '市儿童医院', od: { sph: 7, cyl: -0.75, axis: 180, va: 0.5 }, os: { sph: 6.5, cyl: 0, axis: 0, va: null } })
    expect(v.nextDate > TODAY).toBe(true)
    expect(w.text()).toContain('当前处方')
    expect(w.text()).toContain('+7.00 / -0.75 × 180')
    expect(w.findAll('[data-test="visit-card"]')).toHaveLength(1)
  })

  it('必填项缺失或日期在将来时不保存并提示', async () => {
    const w = await render(Visits)
    await btn(w, '新增复查记录').trigger('click')
    await w.find('input[name="date"]').setValue(addDays(TODAY, 1))
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(store.visits).toHaveLength(0)
    expect(w.text()).toContain('复查日期不能晚于今天')
    expect(w.text()).toContain('请填写球镜度数')
  })

  it('度数变化 ≥0.50D 高亮；加入日历；删除前确认', async () => {
    store.visits.push(sampleVisit('2026-01-10', 7.5, 'a'), sampleVisit('2026-07-10', 7, 'b'))
    const w = await render(Visits)
    const cards = w.findAll('[data-test="visit-card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('2026-07-10')
    expect(cards[0].classes()).toContain('changed')
    expect(cards[0].findAll('.chg').length).toBe(2) // 两眼球镜都变了 0.50
    expect(cards[1].classes()).not.toContain('changed')

    const dl = vi.spyOn(ics, 'downloadText').mockImplementation(() => {})
    await cards[0].findAll('button').find(b => b.text().includes('加入日历'))!.trigger('click')
    expect(dl).toHaveBeenCalledWith(`复查提醒-${addDays(TODAY, 90)}.ics`, expect.stringContaining('BEGIN:VCALENDAR'), 'text/calendar')

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await cards[1].findAll('button').find(b => b.text() === '删除')!.trigger('click')
    expect(store.visits.map(v => v.id)).toEqual(['b'])
  })

  it('编辑已有记录', async () => {
    store.visits.push(sampleVisit('2026-07-10', 7, 'b'))
    const w = await render(Visits)
    await btn(w, '编辑').trigger('click')
    expect((w.find('input[name="od.sph"]').element as HTMLInputElement).value).toBe('7')
    await w.find('input[name="od.sph"]').setValue('6.75')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(store.visits).toHaveLength(1)
    expect(store.visits[0].od.sph).toBe(6.75)
    expect(store.visits[0].id).toBe('b')
  })
})

describe('Report', () => {
  it('空数据也能渲染', async () => {
    const w = await render(Report)
    expect(w.text()).toContain('视觉档案报告')
    expect(w.text()).toContain('暂无复查记录')
    expect(w.text()).toContain('区间内没有戴镜记录')
    expect(w.text()).toContain('区间内没有自测记录')
    expect(w.text()).toContain('区间内没有观察记录')
    expect(w.text()).toContain('仅供医生参考')
  })

  it('有数据时渲染各部分，可切换范围，打印调用 window.print', async () => {
    store.profile.nickname = '小米'
    store.profile.birthMonth = '2022-06'
    store.visits.push(sampleVisit(addDays(TODAY, -30), 7, 'v1'))
    store.days[TODAY] = { glassesOn: true, secondsTrained: 600, gamesPlayed: ['find-bug'], plan: [], wear: 'full' }
    store.days[addDays(TODAY, -1)] = { glassesOn: true, secondsTrained: 300, gamesPlayed: [], plan: [], wear: 'less' }
    store.acuityTests.push({
      id: 't1', date: addDays(TODAY, -5), ageMonths: 52, distanceMm: 400, pxPerMm: 6, bestMeasurableLogmar: 0,
      od: { logmar: 0.3, trials: [] }, os: { logmar: null, trials: [] }, flags: ['interocular'],
    })
    store.checklists.push({ id: 'c1', date: addDays(TODAY, -3), answers: { 'one-eye': 'often', clumsy: 'often' }, note: '' })
    store.observations.push({ id: 'o1', date: addDays(TODAY, -2), items: ['rub'], note: '傍晚揉眼' })
    store.games['find-bug'] = {
      staircase: null,
      history: [
        { date: addDays(TODAY, -20), levelEnd: 0, trials: 10, correct: 8 },
        { date: TODAY, levelEnd: 6, trials: 10, correct: 8 },
      ],
    }
    const w = await render(Report)
    const t = w.text()
    expect(t).toContain('小米的视觉档案报告')
    expect(t).toContain('+7.00 / -0.75 × 180')
    expect(t).toContain('50%')               // 2 天中 1 天达标
    expect(w.findAll('.strip .sw').length).toBeGreaterThan(80) // 默认 3 个月
    expect(t).toContain('0.5（logMAR 0.3）')
    expect(t).toContain('低于 0.1')
    expect(t).toContain('两眼相差')
    expect(t).toContain('闭上或挡住一只眼才看东西')
    expect(t).toContain('走路容易磕碰')
    expect(t).toContain('傍晚揉眼')
    expect(t).toMatch(/看得细\s*进步 \d+%/)
    expect(t).not.toContain('退步')

    await btn(w, '近 1 个月').trigger('click')
    expect(w.findAll('.strip .sw').length).toBeLessThan(32)

    const orig = window.print
    const print = vi.fn()
    window.print = print
    await btn(w, '打印 / 保存为 PDF').trigger('click')
    expect(print).toHaveBeenCalled()
    window.print = orig
  })

  it('打印不可用时提示截图', async () => {
    const w = await render(Report)
    const orig = window.print
    window.print = (() => { throw new Error('not supported') }) as typeof window.print
    await btn(w, '打印 / 保存为 PDF').trigger('click')
    expect(w.text()).toContain('请截图保存')
    window.print = orig
  })
})
