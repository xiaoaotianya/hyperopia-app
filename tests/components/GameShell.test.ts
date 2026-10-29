import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import GameShell from '../../src/components/GameShell.vue'
import { store, today } from '../../src/core/store'
import { defaultData } from '../../src/core/storage'
import { breakClock } from '../../src/core/breakClock'
import type { GameDefinition } from '../../src/games/types'

// 只存在于测试中的演示游戏：点按钮就判定一次
const Demo = defineComponent({
  props: { level: { type: Number, required: true }, ctx: { type: Object, required: true } },
  emits: ['trial'],
  setup(props, { emit }) {
    return () => h('div', [
      h('span', { class: 'lv' }, String(props.level)),
      h('button', { class: 'ok', onClick: () => emit('trial', true) }),
      h('button', { class: 'bad', onClick: () => emit('trial', false) }),
    ])
  },
})

const demo: GameDefinition = {
  id: 'demo', name: '演示', category: 'fine', icon: '🧪', voiceIntro: '演示', durationSec: 10, levels: 10,
  primaryMetric: { label: 'x', unit: 'y', fromLevel: l => l }, component: Demo,
}

describe('GameShell', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.assign(store, defaultData())
    breakClock.reset()
  })
  afterEach(() => { vi.useRealTimers() })

  it('建记录、热身等级、阶梯更新、计时、结束发贴纸', async () => {
    store.games.demo = { staircase: { level: 6, maxLevel: 10, streak: 0, reversals: 0, lastDir: 0 }, history: [] }
    const w = mount(GameShell, { props: { def: demo } })
    expect(w.find('.lv').exists()).toBe(false) // 准备阶段
    await vi.advanceTimersByTimeAsync(3000)
    expect(w.find('.lv').text()).toBe('4') // warmupLevel(6)
    for (let i = 0; i < 3; i++) await w.find('.ok').trigger('click')
    expect(w.find('.lv').text()).toBe('6')
    expect(store.games.demo.staircase!.level).toBe(6)
    await vi.advanceTimersByTimeAsync(10000)
    expect(today().secondsTrained).toBe(10)
    expect(store.games.demo.history).toEqual([{ date: expect.any(String), levelEnd: 6, trials: 3, correct: 3 }])
    expect(today().gamesPlayed).toEqual(['demo'])
    expect(store.stickers.length).toBe(1)
    await vi.advanceTimersByTimeAsync(3500)
    expect(w.emitted('done')).toBeTruthy()
    w.unmount()
  })

  it('没有记录时新建，到休息间隔时暂停并隐藏游戏', async () => {
    store.settings.breakEveryMin = 0.05 // 3 秒
    const w = mount(GameShell, { props: { def: { ...demo, durationSec: 60 } } })
    expect(store.games.demo.staircase!.level).toBe(0)
    await vi.advanceTimersByTimeAsync(3000 + 3000)
    expect(w.find('.lv').exists()).toBe(false)
    expect(w.find('.break').exists()).toBe(true)
    const trained = today().secondsTrained
    await vi.advanceTimersByTimeAsync(5000)
    expect(today().secondsTrained).toBe(trained) // 休息时不计时
    await w.find('.skip').trigger('click')
    expect(w.find('.lv').exists()).toBe(true)
    w.unmount()
  })
})
