import type { StaircaseState } from './staircase'

export const STORAGE_KEY = 'hyperopia.v1'

export interface GameRecord {
  staircase: StaircaseState | null
  history: { date: string; levelEnd: number; trials: number; correct: number }[]
}
export interface DayRecord { glassesOn: boolean; secondsTrained: number; gamesPlayed: string[]; plan: string[] }
export interface AppData {
  version: 1
  profile: { nickname: string; avatar: string }
  settings: { dailyLimitMin: number; viewingDistanceMm: number; recheckDate: string | null; breakEveryMin: number }
  calibration: { pxPerMm: number | null }
  games: Record<string, GameRecord>
  days: Record<string, DayRecord>
  stickers: string[]
}

export function defaultData(): AppData {
  return {
    version: 1,
    profile: { nickname: '宝贝', avatar: '🐻' },
    settings: { dailyLimitMin: 12, viewingDistanceMm: 400, recheckDate: null, breakEveryMin: 5 },
    calibration: { pxPerMm: null },
    games: {},
    days: {},
    stickers: [],
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrate(raw: any): AppData {
  const base = defaultData()
  return {
    ...base,
    ...raw,
    version: 1,
    profile: { ...base.profile, ...(raw.profile ?? {}) },
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    calibration: { ...base.calibration, ...(raw.calibration ?? {}) },
    games: raw.games ?? {},
    days: raw.days ?? {},
    stickers: raw.stickers ?? [],
  }
}
