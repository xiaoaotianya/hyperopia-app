import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import AcuityTest from '../../src/views/parent/AcuityTest.vue'
import Acuity from '../../src/views/parent/Acuity.vue'
import { router } from '../../src/router'
import { store } from '../../src/core/store'
import { defaultData, type AcuityTest as AcuityRecord } from '../../src/core/storage'
import { markParentOk } from '../../src/core/parentAuth'
import { LEVELS } from '../../src/core/acuity'
import { createRng } from '../../src/core/random'

// jsdom 没有 Canvas；LeaSymbol 拿不到 context 时只设尺寸不绘制
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null) })
afterEach(() => { vi.restoreAllMocks() })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W = VueWrapper<any>

async function clickText(w: W, text: string) {
  const b = w.findAll('button').find(x => x.text().includes(text))
  if (!b) throw new Error(`找不到按钮：${text}；页面：${w.text()}`)
  await b.trigger('click')
  await flushPromises()
}
const currentLevel = (w: W) => {
  const m = /第 (\d+) 档/.exec(w.find('.meta').text())
  if (!m) throw new Error('无档位标签')
  return LEVELS[+m[1] - 1]
}
const shown = (w: W) => w.find('[data-test="stimulus"] canvas').attributes('data-symbol')!

/** 练习 2 题 + 正式测试：level ≥ okDownTo 时答对，否则答错 */
async function runEye(w: W, okDownTo: number) {
  await clickText(w, '先练习 2 题')
  await w.find('[data-answer="apple"]').trigger('click')
  await w.find('[data-answer="unseen"]').trigger('click')
  await flushPromises()
  await clickText(w, '开始正式测试')
  const levels: number[] = []
  for (let n = 0; n < 40 && w.find('[data-test="stimulus"]').exists(); n++) {
    const lv = currentLevel(w)
    levels.push(lv)
    const s = shown(w)
    const wrong = s === 'apple' ? 'house' : 'apple'
    await w.find(`[data-answer="${lv >= okDownTo - 1e-9 ? s : n % 2 ? 'unseen' : wrong}"]`).trigger('click')
    await flushPromises()
  }
  return levels
}

async function mountTest() {
  await router.push('/parent/acuity/test')
  await router.isReady()
  const w = mount(AcuityTest, { props: { rng: createRng(123) }, global: { plugins: [router] } })
  await flushPromises()
  return w as W
}

const rec = (date: string, od: number | null, os: number | null, flags: AcuityRecord['flags'] = []): AcuityRecord => ({
  id: `t-${date}`, date, ageMonths: 50, distanceMm: 400, pxPerMm: 6, bestMeasurableLogmar: 0,
  od: { logmar: od, trials: [
    { logmar: 0.4, symbol: 'apple', answer: 'apple', correct: true },
    { logmar: 0.4, symbol: 'house', answer: 'house', correct: true },
    { logmar: 0.4, symbol: 'circle', answer: 'unseen', correct: false },
    { logmar: 0.3, symbol: 'square', answer: 'apple', correct: false },
    { logmar: 0.3, symbol: 'apple', answer: 'unseen', correct: false },
    { logmar: 0.3, symbol: 'house', answer: 'house', correct: true },
  ] },
  os: { logmar: os, trials: [] },
  flags,
})

describe('AcuityTest 流程', () => {
  let dpr: PropertyDescriptor | undefined
  beforeEach(() => {
    Object.assign(store, defaultData())
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 29, 10))
    markParentOk() // 家长门按（伪造的）当前时间计
    dpr = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio')
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    markParentOk()
    if (dpr) Object.defineProperty(window, 'devicePixelRatio', dpr)
  })

  it('未校准时引导去校准', async () => {
    const w = await mountTest()
    expect(w.text()).toContain('先校准屏幕')
    expect(w.find('a').attributes('href')).toContain('/parent/calibration')
    w.unmount()
  })

  it('走完两只眼，写入一条记录（年龄参考 + 两眼差）', async () => {
    store.calibration.pxPerMm = 6
    store.profile.birthMonth = '2022-08' // 50 个月 → 参考线 logMAR 0.3
    const w = await mountTest()
    expect(w.text()).toContain('戴着眼镜测')
    expect(w.text()).toContain('40 厘米')
    await clickText(w, '准备好了')
    expect(w.text()).toContain('挡住左眼')

    const odLevels = await runEye(w, 0.3)
    expect(odLevels[0]).toBe(0.7) // 首次从 0.7 开始
    expect(store.acuityTests).toHaveLength(0) // 中途不保存
    expect(w.text()).toContain('换眼')
    expect(w.text()).toContain('挡住右眼')

    await runEye(w, 0.5)
    expect(store.acuityTests).toHaveLength(1)
    const t = store.acuityTests[0]
    expect(t.date).toBe('2026-10-29')
    expect(t.ageMonths).toBe(50)
    expect(t.distanceMm).toBe(400)
    expect(t.pxPerMm).toBe(6)
    expect(t.bestMeasurableLogmar).toBe(0)
    expect(t.od.logmar).toBe(0.3)
    expect(t.os.logmar).toBe(0.5)
    expect(t.od.trials).toHaveLength(6 * 3) // 0.7 … 0.2，练习题不计入
    expect(t.os.trials).toHaveLength(4 * 3)
    expect(t.flags).toEqual(['below-age', 'interocular'])
    expect(t.id).toMatch(/^[0-9a-z]+$/)

    // 结果页
    expect(w.text()).toContain('0.5')
    expect(w.text()).toContain('logMAR 0.3')
    expect(w.text()).toContain('首次测试')
    expect(w.text()).toContain('建议 1 周内重测一次')
    expect(w.text()).not.toContain('本设备最好只能测到')
    await clickText(w, '查看趋势')
    expect(router.currentRoute.value.path).toBe('/parent/acuity')
    w.unmount()
  })

  it('上次劣于 1.0 时从 1.0 开始；与上次对比；14 天内二次异常提示就医', async () => {
    store.calibration.pxPerMm = 6
    store.acuityTests.push(rec('2026-10-20', null, 0.2, ['interocular']))
    const w = await mountTest()
    await clickText(w, '准备好了')
    const od = await runEye(w, 0.4)
    expect(od[0]).toBe(1)
    const os = await runEye(w, 0.6)
    expect(os[0]).toBe(0.4) // 上次 0.2 + 0.2
    const t = store.acuityTests[1]
    expect([t.od.logmar, t.os.logmar]).toEqual([0.4, 0.6])
    expect(t.flags).toEqual(['interocular', 'decline'])
    const cmp = w.findAll('.cmp').map(x => x.text())
    expect(cmp).toEqual(['与上次相比：进步', '与上次相比：下降'])
    expect(w.text()).toContain('建议近期带孩子去医院复查')
    w.unmount()
  })

  it('设备下限：结果等于下限时注明，且不判 below-age', async () => {
    store.calibration.pxPerMm = 6
    store.profile.birthMonth = '2021-08' // 62 个月 → 参考线 0.2
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true }) // 最好 0.5
    const w = await mountTest()
    await clickText(w, '准备好了')
    await runEye(w, 0)
    await runEye(w, 0)
    const t = store.acuityTests[0]
    expect(t.bestMeasurableLogmar).toBe(0.5)
    expect([t.od.logmar, t.os.logmar]).toEqual([0.5, 0.5])
    expect(t.flags).toEqual([])
    expect(w.text()).toContain('本设备最好只能测到 0.32')
    expect(w.text()).toContain('下次建议 2–4 周后再测')
    w.unmount()
  })

  it('切到后台后暂停；可继续或重新开始，中途不保存', async () => {
    store.calibration.pxPerMm = 6
    const w = await mountTest()
    await clickText(w, '准备好了')
    await clickText(w, '先练习 2 题')
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(w.find('.overlay').exists()).toBe(true)
    // 暂停时作答无效
    await w.find('[data-answer="apple"]').trigger('click')
    expect(w.find('.meta').text()).toContain('第 1 题')
    await clickText(w, '继续')
    expect(w.find('.overlay').exists()).toBe(false)
    await clickText(w, '暂停')
    await clickText(w, '重新开始')
    expect(w.text()).toContain('测试前准备')
    expect(store.acuityTests).toHaveLength(0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (document as any).hidden // 恢复原型上的 getter
    w.unmount()
  })
})

describe('Acuity 首页', () => {
  beforeEach(() => { Object.assign(store, defaultData()); markParentOk() })

  async function mountHome() {
    await router.push('/parent/acuity')
    await router.isReady()
    const w = mount(Acuity, { global: { plugins: [router] } })
    await flushPromises()
    return w as W
  }

  it('无记录时可以渲染', async () => {
    const w = await mountHome()
    expect(w.text()).toContain('开始自测')
    expect(w.text()).toContain('还没有自测记录')
    expect(w.text()).toContain('AAPOS')
    expect(w.find('svg.chart').exists()).toBe(false)
    await clickText(w, '开始自测')
    expect(router.currentRoute.value.path).toBe('/parent/acuity/test')
    w.unmount()
  })

  it('2 条记录：趋势图、参考线、历史倒序、展开明细、删除', async () => {
    store.profile.birthMonth = '2022-08'
    store.acuityTests.push(rec('2026-10-01', 0.4, 0.3), rec('2026-10-15', null, 0.3, ['below-age', 'interocular']))
    const w = await mountHome()
    expect(w.findAll('polyline.line')).toHaveLength(2)
    expect(w.find('.age-line').exists()).toBe(true)
    expect(w.text()).toContain('右眼 OD')
    expect(w.text()).toContain('左眼 OS')
    const dates = w.findAll('.item .date').map(d => d.text())
    expect(dates).toEqual(['2026-10-15', '2026-10-01'])
    expect(w.findAll('.item')[0].text()).toContain('右 < 0.1')
    expect(w.findAll('.item')[0].text()).toContain('两眼差')

    await w.findAll('.toggle')[1].trigger('click')
    const detail = w.find('.detail')
    expect(detail.exists()).toBe(true)
    expect(detail.findAll('tr')).toHaveLength(2)
    expect(detail.text()).toContain('✓ ✓ ?')
    expect(detail.text()).toContain('未通过')

    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    await w.findAll('.del')[0].trigger('click')
    expect(store.acuityTests).toHaveLength(2)
    await w.findAll('.del')[0].trigger('click')
    expect(store.acuityTests.map(t => t.date)).toEqual(['2026-10-01'])
    confirm.mockRestore()
    w.unmount()
  })
})

describe('LeaSymbol', () => {
  it('按 dpr 渲染；未拥挤时边长 = cssPx，拥挤时 = cssPx × (1 + 2 × (0.5 + 0.2))', async () => {
    const { default: LeaSymbol } = await import('../../src/components/LeaSymbol.vue')
    const old = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio')
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })
    const a = mount(LeaSymbol, { props: { symbol: 'house', cssPx: 64 } })
    const c = a.find('canvas').element as HTMLCanvasElement
    expect([c.width, c.height]).toEqual([128, 128])
    expect(c.style.width).toBe('64px')
    const b = mount(LeaSymbol, { props: { symbol: 'apple', cssPx: 10, crowded: true } })
    const d = b.find('canvas').element as HTMLCanvasElement
    expect(d.width).toBe(48) // ceil(10 × 2 × 2.4)
    expect(d.style.width).toBe('24px')
    expect(d.dataset.symbol).toBe('apple')
    if (old) Object.defineProperty(window, 'devicePixelRatio', old)
    a.unmount(); b.unmount()
  })
})
