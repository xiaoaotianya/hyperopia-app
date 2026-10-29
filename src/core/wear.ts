import type { DayRecord, WearLevel } from './storage'
import { addDays } from './date'

export const WEAR_LABELS: Record<WearLevel, string> = { full: '全天', most: '大半天', less: '少于一半', none: '没戴' }
export const isGoodDay = (w?: WearLevel) => w === 'full' || w === 'most'

/** 连续达标天数；今天未记录则从昨天数起 */
export function goodStreak(days: Record<string, DayRecord>, today: string): number {
  let k = days[today]?.wear ? today : addDays(today, -1)
  let n = 0
  while (isGoodDay(days[k]?.wear)) { n++; k = addDays(k, -1) }
  return n
}

/** 最近 n 天（含今天），从旧到新 */
export function lastNDays(days: Record<string, DayRecord>, today: string, n: number): { date: string; wear?: WearLevel }[] {
  const r: { date: string; wear?: WearLevel }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const wear = days[date]?.wear
    r.push(wear ? { date, wear } : { date })
  }
  return r
}

/** 近 7 天（含今天）达标天数 */
export function weekGoodCount(days: Record<string, DayRecord>, today: string): number {
  return lastNDays(days, today, 7).filter(d => isGoodDay(d.wear)).length
}

/** 戴镜小树：每个达标天一片叶，7 片一朵花，30 片一个果 */
export function treeState(days: Record<string, DayRecord>): { leaves: number; flowers: number; fruits: number } {
  const leaves = Object.values(days).filter(d => isGoodDay(d.wear)).length
  return { leaves, flowers: Math.floor(leaves / 7), fruits: Math.floor(leaves / 30) }
}

export const STREAK_BADGES = [3, 7, 14, 30] as const

/** 从 prevStreak 到 streak 刚跨过的里程碑 */
export function newBadges(prevStreak: number, streak: number): number[] {
  return STREAK_BADGES.filter(b => prevStreak < b && streak >= b)
}

/** "眼镜小勇士"贴纸，每个里程碑一个独立字符串 */
export const badgeSticker = (b: number) => `👓🏅${b}`

/**
 * 发贴纸用的连续天数：今天未达标（未记录或记为少于一半 / 没戴）时从昨天数起，
 * 这样家长当天改档不会让连续天数归零。
 */
export function badgeStreak(days: Record<string, DayRecord>, today: string): number {
  return goodStreak(days, isGoodDay(days[today]?.wear) ? today : addDays(today, -1))
}

/**
 * 里程碑贴纸发放决策：award 为本次应发的里程碑，next 为新的 lastBadgeStreak。
 * 只少 1 天视为今天当天改档（badgeStreak 只会因此少 1），保留 lastBadgeStreak，避免改回来时重复发放；
 * 少得更多是真正断档，next 回落到当前天数，之后可以重新获得。
 */
export function badgeUpdate(lastBadgeStreak: number, streak: number): { award: number[]; next: number } {
  if (streak === lastBadgeStreak - 1) return { award: [], next: lastBadgeStreak }
  return { award: streak < lastBadgeStreak ? [] : newBadges(lastBadgeStreak, streak), next: streak }
}
