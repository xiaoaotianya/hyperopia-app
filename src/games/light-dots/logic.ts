import { type Rng, randInt } from '../../core/random'

export const MAX_LEVEL = 10
export const seqLength = (lv: number) => Math.min(7, 2 + Math.floor(lv / 2))
export const dotCount = (lv: number) => Math.min(9, seqLength(lv) + 2)
export const FADE_IN_MS = 600
export const FADE_OUT_MS = 400
export function makeSequence(lv: number, rng: Rng): number[] {
  const n = dotCount(lv), seq: number[] = []
  while (seq.length < seqLength(lv)) { const d = randInt(rng, 0, n - 1); if (d !== seq[seq.length - 1]) seq.push(d) }
  return seq
}
/** 返回 'continue' | 'done' | 'wrong' */
export function checkInput(seq: number[], input: number[]): 'continue' | 'done' | 'wrong' {
  for (let i = 0; i < input.length; i++) if (input[i] !== seq[i]) return 'wrong'
  return input.length === seq.length ? 'done' : 'continue'
}
