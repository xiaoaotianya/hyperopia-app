import { reactive, watch } from 'vue'
import { createStorage, type DayRecord } from './storage'
import { todayKey } from './date'

const backend = typeof localStorage !== 'undefined' ? localStorage : null
export const storage = createStorage(backend)
export const store = reactive(storage.load())
watch(store, v => storage.save(v), { deep: true })

export function today(): DayRecord {
  const k = todayKey()
  if (!store.days[k]) store.days[k] = { glassesOn: false, secondsTrained: 0, gamesPlayed: [], plan: [] }
  return store.days[k]
}
