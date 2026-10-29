import { type Rng, randInt } from '../../core/random'

export const MAX_LEVEL = 14
export const itemCount = (lv: number) => Math.min(30, 6 + lv * 2)
/** 物件尺寸（角分）：120 → 30 */
export const itemArcmin = (lv: number) => Math.max(30, 120 * Math.pow(0.9, lv))
export const TIMEOUT_MS = 15000

/** shape：干扰物是别的形状；color：同形不同色；near：同色近似形 */
export type Similarity = 'shape' | 'color' | 'near'
export const similarity = (lv: number): Similarity => (lv < 5 ? 'shape' : lv < 10 ? 'color' : 'near')

export const THEMES = ['ocean', 'forest', 'toys'] as const
export type Theme = (typeof THEMES)[number]
export type Kind = 'shell' | 'starfish' | 'fish' | 'leaf' | 'mushroom' | 'acorn' | 'ball' | 'block' | 'star'
export const KINDS: Record<Theme, Kind[]> = {
  ocean: ['shell', 'starfish', 'fish'],
  forest: ['leaf', 'mushroom', 'acorn'],
  toys: ['ball', 'block', 'star'],
}
/** 颜色种数（具体色值在 shapes.ts） */
export const COLOR_COUNT = 6

/** variant：0 = 常规形，1 = 近似形（多一个角 / 缺一块等） */
export interface Item { kind: Kind; variant: 0 | 1; color: number }
export interface Trial { theme: Theme; target: Item; items: Item[]; targetIndex: number }

function otherColor(rng: Rng, c: number) {
  return (c + randInt(rng, 1, COLOR_COUNT - 1)) % COLOR_COUNT
}

export function makeTrial(lv: number, rng: Rng): Trial {
  const theme = THEMES[randInt(rng, 0, THEMES.length - 1)]
  const kinds = KINDS[theme]
  const target: Item = { kind: kinds[randInt(rng, 0, 2)], variant: rng() < 0.5 ? 0 : 1, color: randInt(rng, 0, COLOR_COUNT - 1) }
  const others = kinds.filter(k => k !== target.kind)
  const sim = similarity(lv)
  const n = itemCount(lv)
  const targetIndex = randInt(rng, 0, n - 1)
  const items: Item[] = Array.from({ length: n }, (_, i): Item => {
    if (i === targetIndex) return { ...target }
    if (sim === 'shape') return { kind: others[randInt(rng, 0, others.length - 1)], variant: rng() < 0.5 ? 0 : 1, color: randInt(rng, 0, COLOR_COUNT - 1) }
    if (sim === 'color') return { kind: target.kind, variant: target.variant, color: otherColor(rng, target.color) }
    return { kind: target.kind, variant: target.variant === 0 ? 1 : 0, color: target.color }
  })
  return { theme, target, items, targetIndex }
}

export const isCorrect = (t: Trial, tapped: number) => tapped === t.targetIndex

/**
 * 在 w×h 的矩形里随机撒 n 个半径 r 的圆，圆心距 ≥ max(minDist, 2r)，全部在边界内。
 * 拒绝采样（类泊松盘）；放不下时返回 null，由调用方缩小间距/尺寸后重试。
 */
export function scatter(n: number, w: number, h: number, r: number, minDist: number, rng: Rng): { x: number; y: number }[] | null {
  if (w < 2 * r || h < 2 * r) return null
  const d = Math.max(minDist, 2 * r), d2 = d * d
  for (let restart = 0; restart < 4; restart++) {
    const pts: { x: number; y: number }[] = []
    for (let tries = 0; pts.length < n && tries < 4000; tries++) {
      const p = { x: r + rng() * (w - 2 * r), y: r + rng() * (h - 2 * r) }
      if (pts.every(q => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 >= d2)) pts.push(p)
    }
    if (pts.length === n) return pts
  }
  return null
}
