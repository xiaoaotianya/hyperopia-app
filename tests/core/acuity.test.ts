import { describe, it, expect } from 'vitest'
import {
  LEVELS, SYMBOLS, TRIALS_PER_LEVEL, PASS_COUNT, MIN_DEVICE_PX,
  optotypeArcmin, optotypeCssPx, bestMeasurable, startLevel,
  startEye, nextSymbol, answerEye, flagsFor, needsRecheck, type EyeRun,
} from '../../src/core/acuity'
import { createRng } from '../../src/core/random'
import type { AcuityTest } from '../../src/core/storage'

const t10 = (x: number) => Math.round(x * 10)
/** 在当前档作答：pattern 里 true=答对，false=答错 */
function play(run: EyeRun, pattern: boolean[]): EyeRun {
  for (const ok of pattern) run = answerEye(run, 'house', ok ? 'house' : 'circle')
  return run
}
const PASS = [true, true, false], FAIL = [true, false, false]

describe('acuity 常量与尺寸', () => {
  it('常量', () => {
    expect(LEVELS).toHaveLength(11)
    expect(LEVELS[0]).toBe(1.0); expect(LEVELS[10]).toBe(0)
    expect(SYMBOLS).toEqual(['apple', 'house', 'circle', 'square'])
    expect([TRIALS_PER_LEVEL, PASS_COUNT, MIN_DEVICE_PX]).toEqual([3, 2, 10])
  })
  it('logMAR 0 = 5 角分；logMAR 1 = 50 角分', () => {
    expect(optotypeArcmin(0)).toBe(5)
    expect(optotypeArcmin(1)).toBeCloseTo(50)
  })
  it('logMAR 0 在 400mm 处视标约 0.58mm', () => {
    expect(optotypeCssPx(0, 400, 1)).toBeCloseTo(0.5818, 3)
    expect(optotypeCssPx(0.3, 400, 4)).toBeCloseTo(0.5818 * 4 * Math.pow(10, 0.3), 2)
  })
  it('bestMeasurable：pxPerMm=4、dpr=1 → 0.7；pxPerMm=6.4、dpr=3 → 0', () => {
    expect(bestMeasurable(400, 4, 1)).toBe(0.7)
    expect(bestMeasurable(400, 6.4, 3)).toBe(0)
  })
  it('bestMeasurable：连 1.0 都不够时返回 1.0', () => {
    expect(bestMeasurable(400, 0.1, 1)).toBe(1)
  })
  it('startLevel：首次（undefined）0.7；上次 +0.2；不超过 1.0；不小于 best；在 0.1 网格上', () => {
    expect(startLevel(undefined, 0)).toBe(0.7)
    expect(startLevel(0.1, 0)).toBe(0.3)
    expect(startLevel(0.9, 0)).toBe(1)
    expect(startLevel(0, 0.4)).toBe(0.4)
    expect(startLevel(undefined, 0.8)).toBe(0.8)
    expect(startLevel(0.1 + 0.2 - 0.2, 0)).toBe(0.3) // 浮点误差被吸收
    expect(startLevel(0.30000000004, 0)).toBe(0.5)
  })
  it('startLevel：上次劣于 1.0（null）→ 从 1.0 开始', () => {
    expect(startLevel(null, 0)).toBe(1)
    expect(startLevel(null, 0.8)).toBe(1)
    expect(startLevel(null, 1)).toBe(1)
  })
})

describe('acuity 单眼阶梯状态机', () => {
  it('startEye 初始状态', () => {
    const r = startEye(0.5, 0)
    expect(r).toEqual({ level: 0.5, best: 0, trialsAtLevel: [], passed: [], failed: [], allTrials: [], done: false, result: null })
  })
  it('startEye 把起始档限制在 best 以上并对齐网格', () => {
    expect(startEye(0.2, 0.4).level).toBe(0.4)
    expect(startEye(0.1 + 0.2, 0).level).toBe(0.3)
  })
  it('一路通过到 best', () => {
    let r = startEye(0.3, 0.1)
    r = play(r, PASS); expect(r.level).toBe(0.2); expect(r.done).toBe(false)
    r = play(r, PASS); expect(r.level).toBe(0.1)
    r = play(r, PASS)
    expect(r.done).toBe(true); expect(r.result).toBe(0.1)
    expect(r.passed).toEqual([0.3, 0.2, 0.1]); expect(r.failed).toEqual([])
    expect(r.allTrials).toHaveLength(9)
  })
  it('向下途中在 0.3 不通过 → 结果取 0.4', () => {
    let r = startEye(0.5, 0)
    r = play(r, PASS); r = play(r, PASS)
    expect(r.level).toBe(0.3)
    r = play(r, FAIL)
    expect(r.done).toBe(true); expect(r.result).toBe(0.4)
  })
  it('起始 0.3 不通过 → 回到 0.4 通过，结果 0.4', () => {
    let r = startEye(0.3, 0)
    r = play(r, FAIL); expect(r.level).toBe(0.4); expect(r.done).toBe(false)
    r = play(r, PASS)
    expect(r.done).toBe(true); expect(r.result).toBe(0.4)
    expect(r.failed).toEqual([0.3]); expect(r.passed).toEqual([0.4])
  })
  it('1.0 不通过时结果为 null', () => {
    let r = startEye(0.8, 0)
    r = play(r, FAIL); r = play(r, FAIL); expect(r.level).toBe(1)
    r = play(r, FAIL)
    expect(r.done).toBe(true); expect(r.result).toBeNull()
    expect(r.failed).toEqual([0.8, 0.9, 1])
  })
  it('起始即 best 且通过 → 立即结束', () => {
    const r = play(startEye(0.7, 0.7), PASS)
    expect(r.done).toBe(true); expect(r.result).toBe(0.7)
  })
  it('"看不清"算错，记录在 allTrials', () => {
    let r = startEye(0.5, 0)
    r = answerEye(r, 'apple', 'unseen')
    expect(r.allTrials[0]).toEqual({ logmar: 0.5, symbol: 'apple', answer: 'unseen', correct: false })
    r = answerEye(r, 'house', 'unseen'); r = answerEye(r, 'circle', 'circle')
    expect(r.failed).toEqual([0.5]); expect(r.level).toBe(0.6)
  })
  it('答对 2 题即通过，只答对 1 题不通过', () => {
    expect(play(startEye(0.5, 0), [false, true, true]).passed).toEqual([0.5])
    expect(play(startEye(0.5, 0), [false, false, true]).failed).toEqual([0.5])
  })
  it('每档满 3 题才判定，未满时停留本档；换档后清空本档作答', () => {
    let r = play(startEye(0.5, 0), [true, true])
    expect(r.level).toBe(0.5); expect(r.trialsAtLevel).toHaveLength(2); expect(r.passed).toEqual([])
    r = play(r, [true])
    expect(r.trialsAtLevel).toEqual([])
  })
  it('不修改传入的 run', () => {
    const r0 = startEye(0.5, 0)
    answerEye(r0, 'apple', 'apple')
    expect(r0.allTrials).toEqual([]); expect(r0.trialsAtLevel).toEqual([])
  })
  it('结束后继续作答不再变化', () => {
    const r = play(startEye(0.7, 0.7), PASS)
    expect(answerEye(r, 'apple', 'apple')).toEqual(r)
  })
  it('档位保持在 0.1 网格上（无浮点漂移）', () => {
    let r = startEye(1, 0)
    for (let i = 0; i < 10; i++) r = play(r, PASS)
    expect(r.passed).toEqual([1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1])
    expect(r.level).toBe(0)
    r = play(r, PASS); expect(r.done).toBe(true); expect(r.result).toBe(0)
    expect(r.allTrials).toHaveLength(33)
  })
  it('同一档不重复测：先升后降时结束于已测档', () => {
    // 起始 0.5 不过 → 0.6 不过 → 0.7 通过：0.6 已判定不通过，直接结束，不再测 0.6
    let r = startEye(0.5, 0)
    r = play(r, FAIL); r = play(r, FAIL); r = play(r, PASS)
    expect(r.done).toBe(true); expect(r.result).toBe(0.7)
    expect(r.allTrials).toHaveLength(9)
  })
  it('随机作答：总能终止（≤ 11 档 × 3 题），每档最多测一次，结果自洽', () => {
    const rng = createRng(42)
    for (let it = 0; it < 3000; it++) {
      const best = LEVELS[Math.floor(rng() * 11)]
      const start = startLevel(rng() < 0.2 ? null : LEVELS[Math.floor(rng() * 11)], best)
      let r = startEye(start, best)
      let steps = 0
      while (!r.done) {
        const s = nextSymbol(r, rng)
        const pick = rng()
        r = answerEye(r, s, pick < 0.15 ? 'unseen' : pick < 0.6 ? s : SYMBOLS[Math.floor(rng() * 4)])
        expect(++steps).toBeLessThanOrEqual(11 * 3)
      }
      // 每档恰好 3 题、只测一次
      const counts = new Map<number, number>()
      for (const tr of r.allTrials) counts.set(t10(tr.logmar), (counts.get(t10(tr.logmar)) ?? 0) + 1)
      expect([...counts.values()].every(c => c === 3)).toBe(true)
      const tested = [...r.passed, ...r.failed].map(t10)
      expect(new Set(tested).size).toBe(tested.length)
      expect(tested.length).toBe(counts.size)
      expect(tested.every(x => x >= t10(best) && x <= 10)).toBe(true)
      if (r.result === null) {
        expect(r.failed.map(t10)).toContain(10)
      } else {
        const res = t10(r.result)
        expect(r.result).toBe(res / 10)
        expect(r.passed.map(t10)).toContain(res)
        expect(res === t10(best) || r.failed.map(t10).includes(res - 1)).toBe(true)
      }
    }
  })
})

describe('nextSymbol', () => {
  it('随机且不与上一题相同', () => {
    const rng = createRng(7)
    const seen = new Set<string>()
    for (let n = 0; n < 50; n++) {
      let r = startEye(1, 0)
      let last = ''
      while (!r.done) {
        const s = nextSymbol(r, rng)
        expect(SYMBOLS).toContain(s)
        if (r.trialsAtLevel.length) expect(s).not.toBe(last)
        seen.add(s); last = s
        r = answerEye(r, s, rng() < 0.7 ? s : 'unseen')
      }
    }
    expect(seen.size).toBe(4)
  })
  it('换档后的第一题也不与上一题相同', () => {
    const r = play(startEye(0.5, 0), PASS) // 最后一题是 house
    for (let i = 0; i < 20; i++) expect(nextSymbol(r, () => i / 20)).not.toBe('house')
  })
  it('rng 返回接近 1 时不越界', () => {
    const r = answerEye(startEye(0.5, 0), 'square', 'square')
    expect(nextSymbol(r, () => 0.9999999)).toBe('circle')
    expect(nextSymbol(r, () => 0)).toBe('apple')
  })
})

describe('flagsFor', () => {
  it('无异常', () => {
    expect(flagsFor(0.2, 0.2, null, 50)).toEqual([])
  })
  it('below-age：边界 (48–59 个月参考 0.3)', () => {
    expect(flagsFor(0.3, 0.3, null, 50)).toEqual([])
    expect(flagsFor(0.4, 0.3, null, 50)).toEqual(['below-age'])
    expect(flagsFor(0.1 + 0.2, 0.3, null, 50)).toEqual([]) // 0.30000000000000004
    expect(flagsFor(null, null, null, 50)).toEqual(['below-age'])
  })
  it('below-age：3 岁以下或无月龄不判定', () => {
    expect(flagsFor(0.9, 0.9, null, 35)).toEqual([])
    expect(flagsFor(0.9, 0.9, null, null)).toEqual([])
    expect(flagsFor(0.5, 0.5, null, 36)).toEqual(['below-age'])
    expect(flagsFor(0.4, 0.4, null, 36)).toEqual([])
  })
  it('interocular：差 0.2 触发，0.1 不触发，null 视为 1.1', () => {
    expect(flagsFor(0.1, 0.2, null, null)).toEqual([])
    expect(flagsFor(0.1, 0.3, null, null)).toEqual(['interocular'])
    expect(flagsFor(0.7, 0.5, null, null)).toEqual(['interocular']) // 0.19999999999999996
    expect(flagsFor(1.0, null, null, null)).toEqual([])
    expect(flagsFor(0.9, null, null, null)).toEqual(['interocular'])
  })
  it('decline：任一眼比上次差 >= 0.2', () => {
    expect(flagsFor(0.3, 0.3, { od: 0.2, os: 0.2 }, null)).toEqual([])
    expect(flagsFor(0.4, 0.3, { od: 0.2, os: 0.2 }, null)).toEqual(['decline'])
    expect(flagsFor(0.3, 0.5, { od: 0.2, os: 0.3 }, null)).toEqual(['interocular', 'decline'])
    expect(flagsFor(null, null, { od: 0.9, os: 1.0 }, null)).toEqual(['decline'])
    expect(flagsFor(0.2, 0.2, { od: null, os: null }, null)).toEqual([])
    expect(flagsFor(0.1, 0.1, { od: 0.3, os: 0.3 }, null)).toEqual([]) // 进步不算
  })
  it('below-age：结果等于设备最好可测档时不判定（真实视力可能更好）', () => {
    // 60 个月参考 0.2；设备最好只能测到 0.4
    expect(flagsFor(0.4, 0.4, null, 60, 0.4)).toEqual([])
    expect(flagsFor(0.4, 0.5, null, 60, 0.4)).toEqual(['below-age']) // 左眼 0.5 未到设备下限
    expect(flagsFor(0.5, 0.5, null, 60, 0.4)).toEqual(['below-age'])
    expect(flagsFor(0.1 + 0.3, 0.4, null, 60, 0.4)).toEqual([]) // 浮点
    expect(flagsFor(null, null, null, 60, 1)).toEqual(['below-age']) // null 不等于 1.0
    expect(flagsFor(1, 1, null, 60, 1)).toEqual([])
    expect(flagsFor(0.4, 0.4, null, 60)).toEqual(['below-age']) // 不传时行为不变
    expect(flagsFor(0.4, 0.4, null, 60, undefined)).toEqual(['below-age'])
  })
  it('设备下限不影响 interocular 与 decline', () => {
    expect(flagsFor(0.4, 0.6, null, null, 0.4)).toEqual(['interocular'])
    expect(flagsFor(0.4, 0.4, { od: 0.2, os: 0.2 }, 60, 0.4)).toEqual(['decline'])
  })
  it('多个 flag 按固定顺序', () => {
    expect(flagsFor(0.6, 0.2, { od: 0.2, os: 0.2 }, 60)).toEqual(['below-age', 'interocular', 'decline'])
  })
})

describe('needsRecheck', () => {
  const mk = (date: string, flags: AcuityTest['flags']): AcuityTest => ({
    id: date, date, ageMonths: 50, distanceMm: 400, pxPerMm: 6, bestMeasurableLogmar: 0,
    od: { logmar: 0.2, trials: [] }, os: { logmar: 0.2, trials: [] }, flags,
  })
  it('无测试或最近一次无 flags → none', () => {
    expect(needsRecheck([], '2026-10-29')).toBe('none')
    expect(needsRecheck([mk('2026-10-01', ['decline']), mk('2026-10-10', [])], '2026-10-29')).toBe('none')
  })
  it('最近一次有 flags、前一次无 → retest', () => {
    expect(needsRecheck([mk('2026-10-01', []), mk('2026-10-10', ['interocular'])], '2026-10-29')).toBe('retest')
    expect(needsRecheck([mk('2026-10-10', ['interocular'])], '2026-10-29')).toBe('retest')
  })
  it('14 天内连续两次异常 → see-doctor；超过 14 天 → retest', () => {
    expect(needsRecheck([mk('2026-10-01', ['decline']), mk('2026-10-15', ['below-age'])], '2026-10-29')).toBe('see-doctor')
    expect(needsRecheck([mk('2026-10-01', ['decline']), mk('2026-10-16', ['below-age'])], '2026-10-29')).toBe('retest')
  })
  it('按日期排序判断，不依赖数组顺序', () => {
    expect(needsRecheck([mk('2026-10-15', ['below-age']), mk('2026-10-01', ['decline'])], '2026-10-29')).toBe('see-doctor')
    expect(needsRecheck([mk('2026-10-20', []), mk('2026-10-01', ['decline']), mk('2026-10-15', ['decline'])], '2026-10-29')).toBe('none')
  })
  it('忽略晚于今天的记录', () => {
    expect(needsRecheck([mk('2026-10-20', []), mk('2026-11-01', ['decline'])], '2026-10-29')).toBe('none')
  })
})
