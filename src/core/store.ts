import { reactive, watch } from 'vue'
import { createStorage, type AppData, type DayRecord } from './storage'
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

/**
 * 用 data 覆盖 store 内容。按字段原地替换（数组 splice、对象删旧键再 assign），
 * 让组件里已拿到的 store.days / store.settings 等引用仍然有效。
 */
export function replaceStore(data: AppData, target: AppData = store) {
  const t = target as unknown as Record<string, unknown>
  for (const [k, next] of Object.entries(data)) {
    const cur = t[k]
    if (Array.isArray(cur) && Array.isArray(next)) cur.splice(0, cur.length, ...next)
    else if (cur && next && typeof cur === 'object' && typeof next === 'object' && !Array.isArray(cur) && !Array.isArray(next)) {
      const c = cur as Record<string, unknown>
      for (const key of Object.keys(c)) if (!(key in next)) delete c[key]
      Object.assign(c, next)
    } else t[k] = next
  }
}
