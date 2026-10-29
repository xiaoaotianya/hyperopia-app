import { migrate, type AppData } from './storage'

export const backupFilename = (today: string) => `视觉乐园备份-${today}.json`

const INVALID = '不是有效的备份文件'

/** 校验并迁移备份；无效时当前数据不应被改动（由调用方保证） */
export function parseBackup(text: string):
  | { ok: true; data: AppData; summary: { days: number; tests: number; visits: number; stickers: number } }
  | { ok: false; error: string } {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return { ok: false, error: `${INVALID}（无法解析）` } }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !['days', 'games', 'stickers'].some(k => k in raw))
    return { ok: false, error: INVALID }
  const data = migrate(raw)
  return {
    ok: true, data,
    summary: { days: Object.keys(data.days).length, tests: data.acuityTests.length, visits: data.visits.length, stickers: data.stickers.length },
  }
}

/** 申请持久化存储；浏览器不支持时返回 null */
export async function requestPersist(): Promise<boolean | null> {
  const s = typeof navigator !== 'undefined' ? navigator.storage : undefined
  if (!s?.persist) return null
  try { return await s.persist() } catch { return false }
}
