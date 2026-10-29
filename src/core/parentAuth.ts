/** 家长门：答对后 10 分钟内有效。sessionStorage 不可用时退回内存。 */
const KEY = 'parentOk'
export const PARENT_OK_MS = 10 * 60 * 1000
let memory: number | null = null

export function markParentOk(now = Date.now()) {
  memory = now
  try { sessionStorage.setItem(KEY, String(now)) } catch { /* 无痕模式等 */ }
}

export function isParentOk(now = Date.now()): boolean {
  let t = memory
  try {
    const v = Number(sessionStorage.getItem(KEY))
    if (Number.isFinite(v) && v > 0) t = Math.max(t ?? 0, v)
  } catch { /* 忽略 */ }
  return t !== null && now >= t && now - t < PARENT_OK_MS
}

export function clearParentOk() {
  memory = null
  try { sessionStorage.removeItem(KEY) } catch { /* 忽略 */ }
}
