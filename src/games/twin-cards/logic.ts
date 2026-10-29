import { type Rng, randInt } from '../../core/random'

export const MAX_LEVEL = 12
export const cardCount = (lv: number) => Math.min(8, 3 + Math.floor(lv / 2))
/** 干扰卡与原图相差的格子数 */
export const diffCells = (lv: number) => Math.max(1, 4 - Math.floor(lv / 3))
/** 每个小圆点的直径（角分） */
export const cellArcmin = (lv: number) => 40 * Math.pow(0.9, lv)

/** 3x3 格子，true = 实心点 */
export type Pattern = boolean[]
export interface Trial { cards: Pattern[]; twins: [number, number] }

const key = (p: Pattern) => p.map(Number).join('')

export function makeTrial(lv: number, rng: Rng): Trial {
  const n = cardCount(lv), k = diffCells(lv)
  const base: Pattern = Array.from({ length: 9 }, () => rng() < 0.5)
  const seen = new Set([key(base)])
  const cards: Pattern[] = []
  while (cards.length < n - 2) {
    const p = base.slice()
    const idx = new Set<number>()
    while (idx.size < k) idx.add(randInt(rng, 0, 8))
    idx.forEach(i => (p[i] = !p[i]))
    if (!seen.has(key(p))) { seen.add(key(p)); cards.push(p) }
  }
  const a = randInt(rng, 0, n - 1)
  let b = randInt(rng, 0, n - 2)
  if (b >= a) b++
  const out: Pattern[] = []
  let j = 0
  for (let i = 0; i < n; i++) out.push(i === a || i === b ? base.slice() : cards[j++])
  return { cards: out, twins: [Math.min(a, b), Math.max(a, b)] }
}

export const isCorrect = (t: Trial, x: number, y: number) =>
  Math.min(x, y) === t.twins[0] && Math.max(x, y) === t.twins[1]
