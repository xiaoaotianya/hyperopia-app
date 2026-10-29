import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/core/random'
import { MAX_LEVEL, checkInput, dotCount, makeSequence, seqLength } from '../../src/games/light-dots/logic'

describe('light-dots logic', () => {
  it('序列长度正确，元素在范围内，没有相邻重复', () => {
    const rng = createRng(21)
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      for (let k = 0; k < 30; k++) {
        const seq = makeSequence(lv, rng)
        expect(seq).toHaveLength(seqLength(lv))
        seq.forEach(d => { expect(d).toBeGreaterThanOrEqual(0); expect(d).toBeLessThan(dotCount(lv)) })
        for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1])
      }
    }
  })
  it('灯数不超过 9，且总比序列长', () => {
    for (let lv = 0; lv <= MAX_LEVEL; lv++) {
      expect(dotCount(lv)).toBeLessThanOrEqual(9)
      expect(dotCount(lv)).toBeGreaterThan(seqLength(lv))
    }
  })
  it('checkInput 三种结果', () => {
    const seq = [2, 0, 3]
    expect(checkInput(seq, [])).toBe('continue')
    expect(checkInput(seq, [2])).toBe('continue')
    expect(checkInput(seq, [2, 0])).toBe('continue')
    expect(checkInput(seq, [2, 0, 3])).toBe('done')
    expect(checkInput(seq, [1])).toBe('wrong')
    expect(checkInput(seq, [2, 0, 1])).toBe('wrong')
  })
})
