import { describe, it, expect, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import Game from '../../src/games/copy-pattern/Game.vue'
import { createRng } from '../../src/core/random'
import {
  MAX_LEVEL, gridSize, litCount, hidesModel, makePattern, judge, toggle,
} from '../../src/games/copy-pattern/logic'

describe('copy-pattern logic', () => {
  it('网格大小和点亮数', () => {
    expect(gridSize(0)).toBe(2)
    expect(gridSize(3)).toBe(2)
    expect(gridSize(4)).toBe(3)
    expect(gridSize(7)).toBe(3)
    expect(gridSize(8)).toBe(4)
    expect(gridSize(MAX_LEVEL)).toBe(4)
    expect(litCount(0)).toBe(1)
    expect(litCount(MAX_LEVEL)).toBe(6)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) expect(litCount(lv)).toBeLessThan(gridSize(lv) ** 2)
    expect(hidesModel(9)).toBe(false)
    expect(hidesModel(10)).toBe(true)
  })

  it('图案：数量对、不重复、在范围内', () => {
    const rng = createRng(5)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      for (let k = 0; k < 30; k++) {
        const p = makePattern(lv, rng)
        expect(p).toHaveLength(litCount(lv))
        expect(new Set(p).size).toBe(p.length)
        p.forEach(i => {
          expect(Number.isInteger(i)).toBe(true)
          expect(i).toBeGreaterThanOrEqual(0)
          expect(i).toBeLessThan(gridSize(lv) ** 2)
        })
      }
    }
  })

  it('判定：位置完全相同才算对（与顺序无关）', () => {
    expect(judge([1, 3, 5], [5, 1, 3])).toBe(true)
    expect(judge([1, 3, 5], [1, 3, 4])).toBe(false)
    expect(judge([1], [1])).toBe(true)
    expect(judge([1, 2], [1])).toBe(false)
  })

  it('点击切换，不修改原数组', () => {
    expect(toggle([], 2)).toEqual([2])
    expect(toggle([2, 4], 2)).toEqual([4])
    const a = [1]
    toggle(a, 3)
    expect(a).toEqual([1])
  })
})

describe('copy-pattern 组件', () => {
  afterEach(() => { vi.useRealTimers() })

  it('上一题的 3 秒隐藏定时器不会提前藏起新一题的样子', async () => {
    vi.useFakeTimers()
    const ctx = { arcminToPx: (a: number) => a, pxPerDegree: () => 60, speak: () => {}, playCorrect: () => {}, playWrong: () => {} }
    const w = mount(Game, { props: { level: 10, ctx } })
    await nextTick()
    const answerFirst = async () => {
      const lit = w.findAll('.model .cell').map((c, i) => (c.find('svg').exists() ? i : -1)).filter(i => i >= 0)
      const cells = w.findAll('.answer .cell')
      for (const i of lit) await cells[i].trigger('pointerdown')
    }
    await answerFirst()                                   // 1 秒内答对
    expect(w.emitted('trial')).toEqual([[true]])
    await vi.advanceTimersByTimeAsync(1300)               // 出新题
    await vi.advanceTimersByTimeAsync(2000)               // 旧定时器本该在此时触发
    expect(w.find('.model').classes()).not.toContain('hidden')
    await vi.advanceTimersByTimeAsync(1100)               // 新题满 3 秒
    expect(w.find('.model').classes()).toContain('hidden')
    w.unmount()
  })
})
