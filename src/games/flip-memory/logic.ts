// 翻翻乐：先全部翻开预览，再盖上，翻两张相同的就留下。
import { type Rng, shuffle } from '../../core/random'

export const MAX_LEVEL = 12
export const pairCount = (lv: number) => Math.min(8, 2 + Math.floor(lv / 2))
export const previewMs = (lv: number) => Math.max(1500, 4000 - lv * 250)

export interface Theme { id: string; back: string; bg: string; faces: string[] }
// 卡面用 emoji：本游戏考的是记忆，不是视力
export const THEMES: Theme[] = [
  { id: 'fruit', back: '#f29b72', bg: '#f4e6d4', faces: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍒', '🍐', '🍑', '🥝'] },
  { id: 'animal', back: '#7fb77e', bg: '#e3ecd6', faces: ['🐶', '🐱', '🐰', '🐻', '🐼', '🐸', '🐵', '🐷', '🐯', '🐮'] },
  { id: 'vehicle', back: '#6fa3d6', bg: '#dfe8f0', faces: ['🚗', '🚌', '🚂', '🚀', '🚁', '🚲', '🚒', '🚜', '⛵', '✈️'] },
]

/** 牌面：pairCount 种面值，每种两张，打乱。值是主题 faces 的下标 */
export function makeBoard(lv: number, rng: Rng, faceCount = 10): number[] {
  const n = pairCount(lv)
  const faces = shuffle(rng, Array.from({ length: faceCount }, (_, i) => i)).slice(0, n)
  return shuffle(rng, [...faces, ...faces])
}

export interface MemState {
  cards: number[]
  matched: boolean[]
  seen: boolean[]      // 是否已经被看见过（预览也算）
  open: number[]       // 当前翻开（未配对）的牌，最多 2 张
}

/** first：翻开第一张；match：配对成功；mismatch-counted：搭档见过却翻错（算错）；mismatch-free：不算；ignored：无效点击 */
export type FlipEvent = 'first' | 'match' | 'mismatch-counted' | 'mismatch-free' | 'ignored'

export function initState(cards: number[], previewed: boolean): MemState {
  return {
    cards: cards.slice(),
    matched: cards.map(() => false),
    seen: cards.map(() => previewed),
    open: [],
  }
}

const partnerOf = (cards: number[], i: number) => cards.findIndex((c, j) => j !== i && c === cards[i])

/** 纯函数：翻开第 i 张，返回新状态和事件（不修改传入的状态） */
export function flip(s: MemState, i: number): { state: MemState; event: FlipEvent } {
  if (i < 0 || i >= s.cards.length || s.matched[i] || s.open.includes(i) || s.open.length >= 2) {
    return { state: s, event: 'ignored' }
  }
  const seenBefore = s.seen.slice()
  const seen = s.seen.slice(); seen[i] = true
  if (s.open.length === 0) {
    return { state: { ...s, seen, open: [i] }, event: 'first' }
  }
  const a = s.open[0]
  if (s.cards[a] === s.cards[i]) {
    const matched = s.matched.slice(); matched[a] = true; matched[i] = true
    return { state: { ...s, seen, matched, open: [] }, event: 'match' }
  }
  const partner = partnerOf(s.cards, i)
  const counted = partner >= 0 && seenBefore[partner]
  return { state: { ...s, seen, open: [a, i] }, event: counted ? 'mismatch-counted' : 'mismatch-free' }
}

/** 把翻错的两张盖回去 */
export const closeOpen = (s: MemState): MemState => ({ ...s, open: [] })

export const isCleared = (s: MemState) => s.matched.every(Boolean)

/** 选网格：在 W×H 里放 n 张正方形卡片，使卡片最大 */
export function chooseGrid(n: number, W: number, H: number, gap: number) {
  let best = { cols: n, rows: 1, card: 0 }
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    const card = Math.min((W - (cols - 1) * gap) / cols, (H - (rows - 1) * gap) / rows)
    if (card > best.card) best = { cols, rows, card }
  }
  return best
}
