import type { DayRecord } from './storage'
export const STICKERS = ['🌟','🍓','🐳','🌈','🚀','🦄','🍉','🐥','🌻','🎠','🐠','🍭','🦖','🧸','🎈','🐼']
export function nextSticker(owned: string[]): string { return STICKERS[owned.length % STICKERS.length] }
export function glassesStreak(days: Record<string, Pick<DayRecord, 'glassesOn'>>, today: string): number {
  let n = 0
  const d = new Date(today + 'T00:00:00')
  for (;;) {
    const p = (x: number) => String(x).padStart(2, '0')
    const k = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    if (!days[k]?.glassesOn) return n
    n++; d.setDate(d.getDate() - 1)
  }
}
