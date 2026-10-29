export const remainingSec = (trainedSec: number, limitMin: number) => Math.max(0, limitMin * 60 - trainedSec)
export const isLocked = (trainedSec: number, limitMin: number) => remainingSec(trainedSec, limitMin) === 0
/** sinceBreakSec: 距离上次休息累计的训练秒数 */
export const needsBreak = (sinceBreakSec: number, breakEveryMin: number) => sinceBreakSec >= breakEveryMin * 60
