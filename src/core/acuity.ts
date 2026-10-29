import type { AcuityTest, AcuityTrial } from './storage'
import { arcminToPx } from './calibration'
import { ageThresholdLogmar } from './ageNorms'
import { daysBetween } from './date'

export const LEVELS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0]
export const SYMBOLS = ['apple', 'house', 'circle', 'square'] as const
export const TRIALS_PER_LEVEL = 3, PASS_COUNT = 2, MIN_DEVICE_PX = 10

// logMAR 一律换成 0.1 的整数档比较，避免浮点误差
const tenth = (x: number) => Math.round(x * 10)
const snap = (x: number) => tenth(x) / 10
const NULL_TENTH = 11 // 劣于 1.0 视为 1.1

/** 视标高度 = 5 × MAR（角分） */
export const optotypeArcmin = (logmar: number) => 5 * Math.pow(10, logmar)

export function optotypeCssPx(logmar: number, distanceMm: number, pxPerMm: number): number {
  return arcminToPx(optotypeArcmin(logmar), distanceMm, pxPerMm)
}

/** 本设备可测的最好档：视标不少于 MIN_DEVICE_PX 个设备像素；连 1.0 都不满足时返回 1.0 */
export function bestMeasurable(distanceMm: number, pxPerMm: number, dpr: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (optotypeCssPx(LEVELS[i], distanceMm, pxPerMm) * dpr >= MIN_DEVICE_PX) return LEVELS[i]
  }
  return 1.0
}

/**
 * 起始档：无上次测试（undefined）→ 0.7；上次劣于 1.0（null）→ 1.0；
 * 否则上次 +0.2（不超过 1.0）；不小于 best
 */
export function startLevel(prev: number | null | undefined, best: number): number {
  const s = prev === undefined ? 7 : prev === null ? 10 : Math.min(10, tenth(prev) + 2)
  return Math.max(s, tenth(best)) / 10
}

// 单眼阶梯流程状态机（纯函数）
export interface EyeRun {
  level: number; best: number
  trialsAtLevel: { symbol: string; correct: boolean }[]
  passed: number[]; failed: number[]           // 已判定通过 / 不通过的档位
  allTrials: AcuityTrial[]; done: boolean; result: number | null
}

export function startEye(start: number, best: number): EyeRun {
  const b = snap(best)
  return { level: Math.max(snap(start), b), best: b, trialsAtLevel: [], passed: [], failed: [], allTrials: [], done: false, result: null }
}

/** 随机视标，且不与上一题相同 */
export function nextSymbol(run: EyeRun, rng: () => number): string {
  const last = run.allTrials[run.allTrials.length - 1]?.symbol
  const pool = SYMBOLS.filter(s => s !== last)
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
}

export function answerEye(run: EyeRun, symbol: string, answer: string | 'unseen'): EyeRun {
  if (run.done) return run
  const correct = answer !== 'unseen' && answer === symbol
  const r: EyeRun = {
    ...run,
    trialsAtLevel: [...run.trialsAtLevel, { symbol, correct }],
    passed: [...run.passed], failed: [...run.failed],
    allTrials: [...run.allTrials, { logmar: run.level, symbol, answer, correct }],
  }
  if (r.trialsAtLevel.length < TRIALS_PER_LEVEL) return r

  const lv = tenth(r.level)
  const has = (list: number[], t: number) => list.some(x => tenth(x) === t)
  const finish = (result: number | null): EyeRun => ({ ...r, trialsAtLevel: [], done: true, result })
  const moveTo = (t: number): EyeRun => ({ ...r, trialsAtLevel: [], level: t / 10 })

  if (r.trialsAtLevel.filter(t => t.correct).length >= PASS_COUNT) {
    r.passed.push(r.level)
    // 已到 best，或更小一档已判定不通过（同一档不重复测）
    if (lv <= tenth(r.best) || has(r.failed, lv - 1) || has(r.passed, lv - 1)) return finish(r.level)
    return moveTo(lv - 1)
  }
  r.failed.push(r.level)
  if (lv >= 10) return finish(null)
  if (has(r.passed, lv + 1)) return finish(snap((lv + 1) / 10))
  if (has(r.failed, lv + 1)) return finish(null) // 防御：正常流程不会出现
  return moveTo(lv + 1)
}

/**
 * 本次异常标记；null 视为 1.1 参与比较。
 * bestMeasurable：本设备可测的最好档。某眼结果正好等于它时，真实视力可能更好，
 * 该眼不判 below-age（两眼差与下降的判定不变）。
 */
export function flagsFor(
  od: number | null, os: number | null,
  prev: { od: number | null; os: number | null } | null,
  ageMonths: number | null,
  bestMeasurable?: number,
): AcuityTest['flags'] {
  const t = (x: number | null) => (x === null ? NULL_TENTH : tenth(x))
  const R = t(od), L = t(os)
  const flags: AcuityTest['flags'] = []
  const th = ageThresholdLogmar(ageMonths)
  const atLimit = (x: number | null) => x !== null && bestMeasurable !== undefined && tenth(x) === tenth(bestMeasurable)
  const below = (x: number | null) => th !== null && t(x) > tenth(th) && !atLimit(x)
  if (below(od) || below(os)) flags.push('below-age')
  if (Math.abs(R - L) >= 2) flags.push('interocular')
  if (prev && (R - t(prev.od) >= 2 || L - t(prev.os) >= 2)) flags.push('decline')
  return flags
}

/** 最近一次无异常 → none；14 天内前一次也异常 → see-doctor；否则 retest */
export function needsRecheck(tests: AcuityTest[], today: string): 'none' | 'retest' | 'see-doctor' {
  const list = tests.filter(t => t.date <= today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const last = list[list.length - 1]
  if (!last || !last.flags.length) return 'none'
  const prev = list[list.length - 2]
  if (prev && prev.flags.length && daysBetween(prev.date, last.date) <= 14) return 'see-doctor'
  return 'retest'
}
