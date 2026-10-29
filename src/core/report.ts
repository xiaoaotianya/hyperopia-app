import type { AcuityTest, Checklist, DayRecord, GameRecord, Observation, WearLevel } from './storage'
import type { Category } from './dailyPlan'
import { addDays, daysBetween } from './date'
import { addMonths } from './visits'
import { isGoodDay } from './wear'
import { checklistFindings } from './checklist'

export const RANGE_MONTHS = [1, 3, 6] as const

/** 统计区间 [start, today]：start = 今天往前 months 个月的次日 */
export function rangeStart(today: string, months: number): string {
  return addDays(addMonths(today, -months), 1)
}
const inRange = (date: string, start: string, end: string) => date >= start && date <= end
const byDate = <T extends { date: string }>(a: T, b: T) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)

// ---- 戴镜依从性 ----
export interface WearSummary {
  totalDays: number; recorded: number; good: number
  /** 达标天占已记录天数的百分比；没有记录时为 null */
  goodPct: number | null
  counts: Record<WearLevel, number>
  strip: { date: string; wear?: WearLevel }[]
}

export function wearSummary(days: Record<string, DayRecord>, start: string, end: string): WearSummary {
  const counts: Record<WearLevel, number> = { full: 0, most: 0, less: 0, none: 0 }
  const strip: { date: string; wear?: WearLevel }[] = []
  const n = daysBetween(start, end) + 1
  for (let i = 0; i < n; i++) {
    const date = addDays(start, i)
    const wear = days[date]?.wear
    if (wear) counts[wear]++
    strip.push(wear ? { date, wear } : { date })
  }
  const recorded = counts.full + counts.most + counts.less + counts.none
  const good = strip.filter(d => isGoodDay(d.wear)).length
  return { totalDays: n, recorded, good, goodPct: recorded ? Math.round((good / recorded) * 100) : null, counts, strip }
}

// ---- 视力自测 ----
export function acuityInRange(tests: AcuityTest[], start: string, end: string): { inRange: AcuityTest[]; latest3: AcuityTest[] } {
  const sorted = tests.filter(t => t.date <= end).sort(byDate)
  return { inRange: sorted.filter(t => t.date >= start), latest3: sorted.slice(-3).reverse() }
}

// ---- 观察记录 ----
export interface ObservationSummary {
  checklistCount: number
  /** 重点信号（有时 / 经常）及出现日期 */
  key: { id: string; dates: string[] }[]
  /** 其他项"经常"及出现日期 */
  often: { id: string; dates: string[] }[]
  notes: { date: string; items: string[]; note: string; source: 'checklist' | 'observation' }[]
}

export function observationSummary(checklists: Checklist[], observations: Observation[], start: string, end: string): ObservationSummary {
  const cs = checklists.filter(c => inRange(c.date, start, end)).sort(byDate)
  const key = new Map<string, string[]>(), often = new Map<string, string[]>()
  const add = (m: Map<string, string[]>, id: string, date: string) => m.set(id, [...(m.get(id) ?? []), date])
  for (const c of cs) {
    const f = checklistFindings(c)
    f.key.forEach(id => add(key, id, c.date))
    f.often.forEach(id => add(often, id, c.date))
  }
  const notes: ObservationSummary['notes'] = [
    ...cs.filter(c => c.note.trim()).map(c => ({ date: c.date, items: [], note: c.note.trim(), source: 'checklist' as const })),
    ...observations.filter(o => inRange(o.date, start, end)).map(o => ({ date: o.date, items: o.items, note: o.note.trim(), source: 'observation' as const })),
  ].sort(byDate)
  const list = (m: Map<string, string[]>) => [...m].map(([id, dates]) => ({ id, dates }))
  return { checklistCount: cs.length, key: list(key), often: list(often), notes }
}

// ---- 训练概况 ----

/**
 * 从 first 到 last 等级的进步，占该游戏等级范围的百分比（可能为负，调用方只展示"进步 / 保持"）。
 * 按等级而不是 primaryMetric 比较：各游戏指标的量纲不同，有的会在高等级变成 0。
 */
export function levelProgress(levels: number, first: number, last: number): number {
  if (first === last || !(levels > 0)) return 0
  return ((last - first) / levels) * 100
}

export interface GameLike { id: string; category: Category; levels: number }

export const CATEGORY_ORDER: Category[] = ['fine', 'contrast', 'eye-move', 'hand-eye']
const CATEGORY_DETAIL: Record<Category, string> = {
  fine: '能分辨的图案更小了',
  contrast: '能看清更淡的图案了',
  'eye-move': '追踪和寻找目标更快更准了',
  'hand-eye': '手眼配合和记忆更好了',
}

export interface CategorySummary {
  category: Category
  games: number      // 区间内有训练记录的游戏数
  pct: number | null // 平均等级进步百分比（取整、0–100）；没有记录时为 null
  text: string       // "进步 x%" / "保持" / "区间内没有训练"
  detail: string
}
export interface TrainingSummary { days: number; minutes: number; categories: CategorySummary[] }

export function trainingSummary(
  games: GameLike[], records: Record<string, GameRecord>, days: Record<string, DayRecord>, start: string, end: string,
): TrainingSummary {
  const dayList = Object.entries(days).filter(([k, d]) => inRange(k, start, end) && d.secondsTrained > 0)
  const seconds = dayList.reduce((s, [, d]) => s + d.secondsTrained, 0)

  const per = new Map<Category, number[]>()
  for (const g of games) {
    const hist = (records[g.id]?.history ?? []).filter(h => inRange(h.date, start, end))
    if (!hist.length) continue
    // 同一天可能有多条，保持原有顺序（追加顺序即时间顺序）
    const sorted = hist.map((h, i) => ({ h, i })).sort((a, b) => byDate(a.h, b.h) || a.i - b.i).map(x => x.h)
    const p = levelProgress(g.levels, sorted[0].levelEnd, sorted[sorted.length - 1].levelEnd)
    per.set(g.category, [...(per.get(g.category) ?? []), p])
  }

  const categories = CATEGORY_ORDER.map((category): CategorySummary => {
    const ps = per.get(category) ?? []
    if (!ps.length) return { category, games: 0, pct: null, text: '区间内没有训练', detail: '' }
    const pct = Math.min(100, Math.max(0, Math.round(ps.reduce((a, b) => a + b, 0) / ps.length)))
    return pct >= 1
      ? { category, games: ps.length, pct, text: `进步 ${pct}%`, detail: CATEGORY_DETAIL[category] }
      : { category, games: ps.length, pct: 0, text: '保持', detail: '水平保持稳定' }
  })
  return { days: dayList.length, minutes: Math.round(seconds / 60), categories }
}

/** 月龄显示：4 岁 2 个月 */
export function fmtAge(months: number | null): string {
  if (months === null) return '未填写'
  const y = Math.floor(months / 12), m = months % 12
  return y ? `${y} 岁${m ? ` ${m} 个月` : ''}` : `${m} 个月`
}
