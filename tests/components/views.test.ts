import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import App from '../../src/App.vue'
import { router } from '../../src/router'
import { store } from '../../src/core/store'
import { defaultData } from '../../src/core/storage'
import { markParentOk } from '../../src/core/parentAuth'

async function render(path: string) {
  await router.push(path)
  await router.isReady()
  const w = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return w
}

describe('页面冒烟', () => {
  beforeEach(() => { Object.assign(store, defaultData()); markParentOk() })

  it('KidHome 显示戴镜确认，确认后进入今日计划', async () => {
    const w = await render('/')
    expect(w.text()).toContain('今天戴好眼镜了吗')
    await w.find('.big-btn').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/today')
    // 今日计划至少 4 个游戏（4 类各 1 个），每张未完成卡片带 ▶
    expect(w.text().match(/▶/g)?.length ?? 0).toBeGreaterThanOrEqual(4)
    w.unmount()
  })

  it.each([
    ['/park', '找小瓢虫'],
    ['/stickers', '我的贴纸'],
    ['/done', '今天练完啦'],
    ['/parent', '戴镜打卡'],
    ['/parent/checkin', '已连续戴镜'],
    ['/parent/progress', '近 14 天训练时长'],
    ['/parent/settings', '每日时长上限'],
    ['/parent/calibration', '银行卡'],
    ['/parent/disclaimer', '不能降低远视度数'],
  ])('%s 能渲染', async (path, text) => {
    const w = await render(path)
    expect(router.currentRoute.value.path).toBe(path)
    expect(w.text()).toContain(text)
    w.unmount()
  })
})
