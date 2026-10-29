// 照样子摆：上面是样子，在下面的空格子里点亮相同的位置。
import { type Rng, shuffle } from '../../core/random'

export const MAX_LEVEL = 14
export const gridSize = (lv: number) => (lv < 4 ? 2 : lv < 8 ? 3 : 4)
export const litCount = (lv: number) => Math.min(6, 1 + Math.floor(lv / 2), gridSize(lv) ** 2 - 1)
/** 高等级时样子只显示 3 秒 */
export const hidesModel = (lv: number) => lv >= 10
export const MODEL_SHOW_MS = 3000

/** 随机挑 litCount 个不同的格子（行主序编号），升序返回 */
export function makePattern(lv: number, rng: Rng): number[] {
  const n = gridSize(lv) ** 2
  return shuffle(rng, Array.from({ length: n }, (_, i) => i)).slice(0, litCount(lv)).sort((a, b) => a - b)
}

/** 位置集合完全相同才算对 */
export function judge(target: number[], chosen: number[]): boolean {
  if (target.length !== chosen.length) return false
  const t = new Set(target)
  return chosen.every(i => t.has(i)) && new Set(chosen).size === chosen.length
}

/** 切换一个格子（返回新数组） */
export const toggle = (chosen: number[], i: number): number[] =>
  chosen.includes(i) ? chosen.filter(c => c !== i) : [...chosen, i]

export type ThemeId = 'star' | 'candy' | 'flower'
export const THEMES: ThemeId[] = ['star', 'candy', 'flower']
