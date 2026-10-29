import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Game from '../../src/games/shadow-match/Game.vue'
import { createRng } from '../../src/core/random'
import {
  MAX_LEVEL, shadowCount, rotationDeg, sizeArcmin, THEMES, rotateShape, mirrorShape, removePart,
  sameShape, makeTrial, shapeRadius,
} from '../../src/games/shadow-match/logic'

const allShapes = THEMES.flatMap(t => t.shapes)

describe('shadow-match logic', () => {
  it('参数随等级变化', () => {
    expect(shadowCount(0)).toBe(2)
    expect(shadowCount(4)).toBe(3)
    expect(shadowCount(MAX_LEVEL)).toBe(4)
    expect(rotationDeg(0)).toBe(90)
    expect(rotationDeg(9)).toBe(18)
    expect(rotationDeg(20)).toBe(15)
    expect(sizeArcmin(0)).toBeCloseTo(220)
    expect(sizeArcmin(MAX_LEVEL)).toBeGreaterThanOrEqual(60)
    expect(sizeArcmin(100)).toBe(60)
    expect(THEMES.length).toBeGreaterThanOrEqual(3)
  })

  it('每个形状都在单位圆内，且至少两个可缺少的部件', () => {
    for (const s of allShapes) {
      expect(shapeRadius(s)).toBeLessThanOrEqual(1.0001)
      expect(s.parts.filter(p => p.removable).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('旋转、镜像、缺部件都和原形不同；原样和自己相同', () => {
    for (const s of allShapes) {
      expect(sameShape(s, s)).toBe(true)
      expect(sameShape(rotateShape(s, 0), s)).toBe(true)
      expect(sameShape(rotateShape(s, 360), s)).toBe(true)
      for (const d of [15, -15, 30, 90]) expect(sameShape(rotateShape(s, d), s)).toBe(false)
      expect(sameShape(mirrorShape(s), s)).toBe(false)
      for (const p of s.parts.filter(p => p.removable)) expect(sameShape(removePart(s, p.name), s)).toBe(false)
    }
  })

  it('变换不修改原形状', () => {
    const s = allShapes[0]
    const before = JSON.stringify(s)
    rotateShape(s, 40); mirrorShape(s); removePart(s, s.parts.find(p => p.removable)!.name)
    expect(JSON.stringify(s)).toBe(before)
  })

  it('每题恰好一个影子和小动物一模一样，其余各不相同', () => {
    const rng = createRng(11)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      for (let k = 0; k < 20; k++) {
        const t = makeTrial(lv, rng)
        expect(t.options).toHaveLength(shadowCount(lv))
        const same = t.options.map(o => sameShape(o.shape, t.animal))
        expect(same.filter(Boolean)).toHaveLength(1)
        expect(same[t.answer]).toBe(true)
        for (let i = 0; i < t.options.length; i++)
          for (let j = i + 1; j < t.options.length; j++)
            expect(sameShape(t.options[i].shape, t.options[j].shape)).toBe(false)
        if (lv < 10) t.options.forEach((o, i) => { if (i !== t.answer) expect(o.kind).toBe('rotate') })
        else t.options.forEach((o, i) => { if (i !== t.answer) expect(['mirror', 'missing']).toContain(o.kind) })
      }
    }
  })
})

describe('shadow-match 组件', () => {
  const ctx = { arcminToPx: (a: number) => a, pxPerDegree: () => 60, speak: () => {}, playCorrect: () => {}, playWrong: () => {} }
  // 舞台在 jsdom 里量不到尺寸，组件按 360×480 布局：影子在 y=144，x=90/270；小动物在 (180, 364.8)
  const dragOntoShadow = async (w: ReturnType<typeof mount>) => {
    const a = w.find('.animal')
    await a.trigger('pointerdown', { pointerId: 1, clientX: 180, clientY: 365 })
    await a.trigger('pointermove', { pointerId: 1, clientX: 90, clientY: 144 })
    return a
  }

  it('拖动被系统打断（pointercancel）：不计判定', async () => {
    const w = mount(Game, { props: { level: 0, ctx } })
    const a = await dragOntoShadow(w)
    await a.trigger('pointercancel', { pointerId: 1 })
    expect(w.emitted('trial')).toBeUndefined()
    w.unmount()
  })

  it('放到影子上（pointerup）：判定一次', async () => {
    const w = mount(Game, { props: { level: 0, ctx } })
    const a = await dragOntoShadow(w)
    await a.trigger('pointerup', { pointerId: 1 })
    expect(w.emitted('trial')).toHaveLength(1)
    w.unmount()
  })
})
