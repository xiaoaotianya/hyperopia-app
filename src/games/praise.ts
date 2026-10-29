/**
 * 答对时的语音表扬：每 3～4 次答对才说一次，避免太吵。
 * 模块级计数器在所有游戏间共享（游戏组件可随时卸载/重挂载）。
 */
import type { GameContext } from './types'

export const PRAISES = [
  '真棒！', '好厉害！', '眼睛真亮！', '太棒啦！', '找得真准！', '你真行！', '一下就看到啦！', '好眼力！',
]

let count = 0
let nextAt = 3

/** 答对时调用；约每 3～4 次答对说一句随机表扬。返回是否说了。 */
export function maybePraise(ctx: Pick<GameContext, 'speak'>, rand: () => number = Math.random): boolean {
  count++
  if (count < nextAt) return false
  count = 0
  nextAt = rand() < 0.5 ? 3 : 4
  ctx.speak(PRAISES[Math.floor(rand() * PRAISES.length) % PRAISES.length])
  return true
}

/** 测试用：重置计数 */
export function resetPraise() { count = 0; nextAt = 3 }
