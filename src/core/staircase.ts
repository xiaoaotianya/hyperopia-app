export interface StaircaseState {
  level: number
  maxLevel: number
  streak: number
  reversals: number
  lastDir: -1 | 0 | 1 // 1=变难 -1=变易
}

export function createStaircase(maxLevel: number, startLevel = 0): StaircaseState {
  return { level: clamp(startLevel, 0, maxLevel), maxLevel, streak: 0, reversals: 0, lastDir: 0 }
}

export function stepStaircase(s: StaircaseState, correct: boolean): StaircaseState {
  const step = s.reversals >= 2 ? 1 : 2
  if (correct) {
    const streak = s.streak + 1
    if (streak < 3) return { ...s, streak }
    return move(s, 1, step)
  }
  return move(s, -1, step)
}

function move(s: StaircaseState, dir: 1 | -1, step: number): StaircaseState {
  const reversals = s.lastDir !== 0 && s.lastDir !== dir ? s.reversals + 1 : s.reversals
  return {
    ...s,
    level: clamp(s.level + dir * step, 0, s.maxLevel),
    streak: 0,
    reversals,
    lastDir: dir,
  }
}

export function warmupLevel(level: number): number {
  return Math.max(0, level - 2)
}

function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)) }
