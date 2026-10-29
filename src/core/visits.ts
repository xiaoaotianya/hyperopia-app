import type { EyeRx, Visit } from './storage'

/** 新记录 id（plan 约定格式） */
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

/** 日期加 n 个月；目标月没有这一天时取月末（如 08-31 + 6 → 02-28） */
export function addMonths(k: string, n: number): string {
  const [y, m, d] = k.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ty = Math.floor(total / 12), tm = total - ty * 12 // 0-11
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  const p = (x: number) => String(x).padStart(2, '0')
  return `${ty}-${p(tm + 1)}-${p(Math.min(d, last))}`
}

/** 度数显示：+7.00 / -0.75 / 0.00 */
export function fmtDiopter(n: number): string {
  if (Math.abs(n) < 1e-9) return '0.00'
  return (n > 0 ? '+' : '-') + Math.abs(n).toFixed(2)
}

/** 处方简写：+7.00 / -0.75 × 180；柱镜为 0 时只写球镜 */
export function fmtRx(rx: EyeRx): string {
  const s = fmtDiopter(rx.sph)
  return Math.abs(rx.cyl) < 1e-9 ? `${s} DS` : `${s} / ${fmtDiopter(rx.cyl)} × ${rx.axis}`
}

export const EYE_POSITION_LABELS: Record<Visit['eyePosition'], string> = {
  normal: '正常', eso: '内斜', exo: '外斜', other: '其他',
}

/** 按日期倒序（同一天按 id 倒序，新加的在前） */
export function sortVisitsDesc(list: Visit[]): Visit[] {
  return [...list].sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
}

export const RX_CHANGE_THRESHOLD = 0.5

export interface EyeDelta { sph: number; cyl: number }
export interface RxChange { od: EyeDelta; os: EyeDelta; significant: boolean }

const round2 = (x: number) => Math.round(x * 100) / 100
/** 单个差值是否达到 0.50D（容许浮点误差） */
export const isSignificant = (delta: number) => Math.abs(delta) >= RX_CHANGE_THRESHOLD - 1e-9

/** 与上一次复查相比的度数变化；没有上一次时返回 null */
export function rxChange(cur: Visit, prev: Visit | undefined): RxChange | null {
  if (!prev) return null
  const eye = (a: EyeRx, b: EyeRx): EyeDelta => ({ sph: round2(a.sph - b.sph), cyl: round2(a.cyl - b.cyl) })
  const od = eye(cur.od, prev.od), os = eye(cur.os, prev.os)
  const significant = [od.sph, od.cyl, os.sph, os.cyl].some(isSignificant)
  return { od, os, significant }
}

// ---- 表单校验（spec §5.1、§10） ----

type Num = string | number | null | undefined
export interface EyeDraft { sph: Num; cyl: Num; axis: Num; va: Num }
export interface VisitDraft {
  date: string; hospital: string; cycloplegic: boolean
  od: EyeDraft; os: EyeDraft
  eyePosition: Visit['eyePosition']
  newGlasses: boolean; advice: string; nextDate: string
}

export function emptyDraft(today: string): VisitDraft {
  const eye = (): EyeDraft => ({ sph: '', cyl: '', axis: '', va: '' })
  return {
    date: today, hospital: '', cycloplegic: true, od: eye(), os: eye(),
    eyePosition: 'normal', newGlasses: false, advice: '', nextDate: addMonths(today, 6),
  }
}

export function draftFromVisit(v: Visit): VisitDraft {
  const eye = (e: EyeRx): EyeDraft => ({ sph: e.sph, cyl: e.cyl, axis: Math.abs(e.cyl) < 1e-9 ? '' : e.axis, va: e.va ?? '' })
  return {
    date: v.date, hospital: v.hospital, cycloplegic: v.cycloplegic, od: eye(v.od), os: eye(v.os),
    eyePosition: v.eyePosition, newGlasses: v.newGlasses, advice: v.advice, nextDate: v.nextDate,
  }
}

export type VisitErrors = Record<string, string>
export type VisitResult = { ok: true; visit: Omit<Visit, 'id'> } | { ok: false; errors: VisitErrors }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const validDate = (s: string) => {
  if (!DATE_RE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}
const blank = (v: Num) => v === null || v === undefined || String(v).trim() === ''
const num = (v: Num) => Number(String(v).trim().replace(/^\+/, ''))
const onQuarter = (x: number) => Math.abs(x * 4 - Math.round(x * 4)) < 1e-6

/**
 * 校验复查表单。错误键：date、nextDate、od.sph、od.cyl、od.axis、od.va（os 同理）。
 * 必填：日期、两眼球镜、下次复查日期；柱镜为空视为 0，柱镜不为 0 时轴位必填。
 */
export function validateVisit(d: VisitDraft, today: string): VisitResult {
  const errors: VisitErrors = {}

  if (!d.date) errors.date = '请填写复查日期'
  else if (!validDate(d.date)) errors.date = '日期格式不正确'
  else if (d.date > today) errors.date = '复查日期不能晚于今天'

  if (!d.nextDate) errors.nextDate = '请填写下次复查日期'
  else if (!validDate(d.nextDate)) errors.nextDate = '日期格式不正确'
  else if (!errors.date && d.nextDate <= d.date) errors.nextDate = '下次复查日期应晚于本次复查日期'

  const eye = (k: 'od' | 'os'): EyeRx | null => {
    const e = d[k]
    let sph = NaN, cyl = 0, axis = 0, va: number | null = null

    if (blank(e.sph)) errors[`${k}.sph`] = '请填写球镜度数'
    else {
      sph = num(e.sph)
      if (!Number.isFinite(sph)) errors[`${k}.sph`] = '请输入数字'
      else if (sph < -20 || sph > 20) errors[`${k}.sph`] = '球镜应在 -20.00 到 +20.00 之间，请检查输入'
      else if (!onQuarter(sph)) errors[`${k}.sph`] = '度数应为 0.25 的倍数'
    }

    if (!blank(e.cyl)) {
      cyl = num(e.cyl)
      if (!Number.isFinite(cyl)) errors[`${k}.cyl`] = '请输入数字'
      else if (cyl < -6 || cyl > 6) errors[`${k}.cyl`] = '柱镜应在 -6.00 到 +6.00 之间，请检查输入'
      else if (!onQuarter(cyl)) errors[`${k}.cyl`] = '度数应为 0.25 的倍数'
    }

    const hasCyl = Number.isFinite(cyl) && Math.abs(cyl) > 1e-9
    if (blank(e.axis)) {
      if (hasCyl) errors[`${k}.axis`] = '有柱镜时请填写轴位'
    } else {
      axis = num(e.axis)
      if (!Number.isInteger(axis) || axis < 0 || axis > 180) errors[`${k}.axis`] = '轴位应为 0 到 180 的整数'
    }

    if (!blank(e.va)) {
      va = num(e.va)
      if (!Number.isFinite(va) || va < 0.05 || va > 2.0) errors[`${k}.va`] = '矫正视力请填小数视力，范围 0.05 到 2.0'
    }

    return { sph, cyl: cyl || 0, axis: hasCyl ? axis : 0, va }
  }

  const od = eye('od'), os = eye('os')
  if (Object.keys(errors).length || !od || !os) return { ok: false, errors }

  return {
    ok: true,
    visit: {
      date: d.date, hospital: d.hospital.trim(), cycloplegic: d.cycloplegic,
      od, os, eyePosition: d.eyePosition, newGlasses: d.newGlasses,
      advice: d.advice.trim(), nextDate: d.nextDate,
    },
  }
}
