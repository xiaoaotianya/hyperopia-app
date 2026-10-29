import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRng } from '../../src/core/random'
import { MAX_LEVEL, cardCount, cellArcmin, diffCells, isCorrect, makeTrial } from '../../src/games/twin-cards/logic'
import Game from '../../src/games/twin-cards/Game.vue'
import type { GameContext } from '../../src/games/types'

const key = (p: boolean[]) => p.map(Number).join('')

describe('twin-cards logic', () => {
  it('恰好一对完全相同，其余两两不同', () => {
    const rng = createRng(11)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      for (let k = 0; k < 30; k++) {
        const t = makeTrial(lv, rng)
        expect(t.cards).toHaveLength(cardCount(lv))
        t.cards.forEach(c => expect(c).toHaveLength(9))
        const keys = t.cards.map(key)
        let pairs = 0
        for (let i = 0; i < keys.length; i++) {
          for (let j = i + 1; j < keys.length; j++) {
            if (keys[i] === keys[j]) { pairs++; expect([i, j]).toEqual(t.twins) }
          }
        }
        expect(pairs).toBe(1)
      }
    }
  })
  it('isCorrect 与点选顺序无关', () => {
    const t = makeTrial(4, createRng(3))
    const [a, b] = t.twins
    expect(isCorrect(t, a, b)).toBe(true)
    expect(isCorrect(t, b, a)).toBe(true)
    const other = [...Array(t.cards.length).keys()].find(i => i !== a && i !== b)!
    expect(isCorrect(t, a, other)).toBe(false)
    expect(isCorrect(t, other, b)).toBe(false)
  })
  it('参数随等级单调', () => {
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      expect(cardCount(lv)).toBeGreaterThanOrEqual(cardCount(lv - 1))
      expect(diffCells(lv)).toBeLessThanOrEqual(diffCells(lv - 1))
      expect(cellArcmin(lv)).toBeLessThan(cellArcmin(lv - 1))
    }
    expect(diffCells(MAX_LEVEL)).toBeGreaterThanOrEqual(1)
  })
})

describe('twin-cards Game', () => {
  const ctx: GameContext = {
    arcminToPx: a => a * 0.5, pxPerDegree: () => 30, speak: () => {}, playCorrect: () => {}, playWrong: () => {},
  }
  const sameCards = (w: ReturnType<typeof mount>) => {
    const cards = w.findAll('.card')
    const keys = cards.map(c => c.findAll('.dot').map(d => (d.classes('on') ? 1 : 0)).join(''))
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) if (keys[i] === keys[j]) return [i, j]
    throw new Error('no twins')
  }

  it('点同一张取消高亮；点中一对 emit trial(true)', async () => {
    const w = mount(Game, { props: { level: 3, ctx } })
    const cards = w.findAll('.card')
    const [a, b] = sameCards(w)
    await cards[a].trigger('pointerdown')
    expect(cards[a].classes()).toContain('picked')
    await cards[a].trigger('pointerdown')
    expect(cards[a].classes()).not.toContain('picked')
    await cards[a].trigger('pointerdown')
    await cards[b].trigger('pointerdown')
    expect(w.emitted('trial')).toEqual([[true]])
    w.unmount()
  })
  it('点错一对 emit trial(false)', async () => {
    const w = mount(Game, { props: { level: 3, ctx } })
    const cards = w.findAll('.card')
    const [a, b] = sameCards(w)
    const other = [...Array(cards.length).keys()].find(i => i !== a && i !== b)!
    await cards[a].trigger('pointerdown')
    await cards[other].trigger('pointerdown')
    expect(w.emitted('trial')).toEqual([[false]])
    w.unmount()
  })
})
