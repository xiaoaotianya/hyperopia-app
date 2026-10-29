import type { StaircaseState } from './staircase'

export const STORAGE_KEY = 'hyperopia.v1'

export interface GameRecord {
  staircase: StaircaseState | null
  history: { date: string; levelEnd: number; trials: number; correct: number }[]
}
export type WearLevel = 'full' | 'most' | 'less' | 'none'
export interface DayRecord {
  glassesOn: boolean; secondsTrained: number; gamesPlayed: string[]; plan: string[]
  wear?: WearLevel
}

export interface AcuityTrial { logmar: number; symbol: string; answer: string | 'unseen'; correct: boolean }
export interface EyeResult { logmar: number | null /* null = 劣于 1.0 */; trials: AcuityTrial[] }
export interface AcuityTest {
  id: string; date: string; ageMonths: number | null
  distanceMm: number; pxPerMm: number; bestMeasurableLogmar: number
  od: EyeResult; os: EyeResult
  flags: ('below-age' | 'interocular' | 'decline')[]
}

export type Freq = 'no' | 'sometimes' | 'often'
export interface Checklist { id: string; date: string; answers: Record<string, Freq>; note: string }
export interface Observation { id: string; date: string; items: string[]; note: string }

export interface EyeRx { sph: number; cyl: number; axis: number; va: number | null /* 小数视力 */ }
export interface Visit {
  id: string; date: string; hospital: string; cycloplegic: boolean
  od: EyeRx; os: EyeRx
  eyePosition: 'normal' | 'eso' | 'exo' | 'other'
  newGlasses: boolean; advice: string; nextDate: string
}

export interface AppData {
  version: 2
  profile: { nickname: string; avatar: string; birthMonth: string | null /* YYYY-MM */ }
  settings: { dailyLimitMin: number; viewingDistanceMm: number; recheckDate: string | null; breakEveryMin: number }
  calibration: { pxPerMm: number | null }
  games: Record<string, GameRecord>
  days: Record<string, DayRecord>
  stickers: string[]
  acuityTests: AcuityTest[]
  checklists: Checklist[]
  observations: Observation[]
  visits: Visit[]
  /** lastBadgeStreak：上次发戴镜里程碑贴纸时的连续天数 */
  meta: { lastBackupAt: string | null; persisted: boolean | null; lastBadgeStreak: number }
}

export function defaultData(): AppData {
  return {
    version: 2,
    profile: { nickname: '宝贝', avatar: '🐻', birthMonth: null },
    settings: { dailyLimitMin: 12, viewingDistanceMm: 400, recheckDate: null, breakEveryMin: 5 },
    calibration: { pxPerMm: null },
    games: {},
    days: {},
    stickers: [],
    acuityTests: [],
    checklists: [],
    observations: [],
    visits: [],
    meta: { lastBackupAt: null, persisted: null, lastBadgeStreak: 0 },
  }
}

type Backend = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function createStorage(backend: Backend | null) {
  let persistent = !!backend
  let memory: string | null = null
  try { backend?.getItem(STORAGE_KEY) } catch { persistent = false }

  const read = () => (persistent ? backend!.getItem(STORAGE_KEY) : memory)
  const write = (v: string) => { if (persistent) backend!.setItem(STORAGE_KEY, v); else memory = v }

  return {
    get persistent() { return persistent },
    load(): AppData {
      const raw = read()
      if (!raw) return defaultData()
      try { return migrate(JSON.parse(raw)) } catch {
        if (persistent) backend!.setItem(`${STORAGE_KEY}.backup.${Date.now()}`, raw)
        return defaultData()
      }
    },
    save(d: AppData) {
      try { write(JSON.stringify(d)) } catch { persistent = false; memory = JSON.stringify(d) }
    },
    clear() { if (persistent) backend!.removeItem(STORAGE_KEY); memory = null },
  }
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? v : [])
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

/** v0 / v1 / 缺字段的数据补齐为 v2，原有数据保留 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrate(raw: any): AppData {
  const base = defaultData()
  raw = obj(raw)
  return {
    ...base,
    ...raw,
    version: 2,
    profile: { ...base.profile, ...obj(raw.profile) },
    settings: { ...base.settings, ...obj(raw.settings) },
    calibration: { ...base.calibration, ...obj(raw.calibration) },
    games: obj(raw.games),
    days: obj(raw.days),
    stickers: arr(raw.stickers),
    acuityTests: arr(raw.acuityTests),
    checklists: arr(raw.checklists),
    observations: arr(raw.observations),
    visits: arr(raw.visits),
    meta: { ...base.meta, ...obj(raw.meta) },
  }
}
