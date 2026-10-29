/** 距离上次休息累计的训练秒数。只存在内存里（不持久化），跨游戏共享，让休息提醒按 breakEveryMin 周期出现。 */
let sinceBreak = 0
export const breakClock = {
  get: () => sinceBreak,
  tick: (sec = 1) => { sinceBreak += sec },
  reset: () => { sinceBreak = 0 },
}
