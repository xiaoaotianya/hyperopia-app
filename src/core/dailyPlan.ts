import { createRng, seedFromString, shuffle } from './random'

export type Category = 'fine' | 'contrast' | 'eye-move' | 'hand-eye'
export interface PlanGame { id: string; category: Category }
const CATS: Category[] = ['fine', 'contrast', 'eye-move', 'hand-eye']

/** history: 日期 -> 当天玩过的游戏 id；date: 今天 YYYY-MM-DD */
export function pickDailyPlan(games: PlanGame[], history: Record<string, string[]>, date: string, count = 5): string[] {
  const rng = createRng(seedFromString(date))
  const yesterday = new Set(history[shiftDate(date, -1)] ?? [])
  const recent = new Map<string, number>()
  for (let i = 1; i <= 7; i++) for (const id of history[shiftDate(date, -i)] ?? []) recent.set(id, (recent.get(id) ?? 0) + 1)

  const rank = (list: PlanGame[]) =>
    shuffle(rng, list).sort((a, b) => score(a) - score(b))
  const score = (g: PlanGame) => (yesterday.has(g.id) ? 100 : 0) + (recent.get(g.id) ?? 0)

  const picked: string[] = []
  for (const c of CATS) {
    const best = rank(games.filter(g => g.category === c))[0]
    if (best) picked.push(best.id)
  }
  for (const g of rank(games.filter(g => !picked.includes(g.id)))) {
    if (picked.length >= count) break
    picked.push(g.id)
  }
  return shuffle(rng, picked.slice(0, Math.max(count, CATS.length)))
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(y, m - 1, d + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`
}
