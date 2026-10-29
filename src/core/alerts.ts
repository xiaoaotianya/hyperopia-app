import type { AppData } from './storage'
import { addDays, daysBetween } from './date'
import { needsRecheck } from './acuity'
import { checklistFindings } from './checklist'
import { weekGoodCount } from './wear'

export type AlertLevel = 'red' | 'yellow' | 'gray'
export interface Alert { id: string; level: AlertLevel; text: string; to: string }

const ORDER: Record<AlertLevel, number> = { red: 0, yellow: 1, gray: 2 }
const byDate = <T extends { date: string }>(list: T[], today: string) =>
  list.filter(x => x.date <= today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
const latest = <T extends { date: string }>(list: T[], today: string): T | undefined => { const l = byDate(list, today); return l[l.length - 1] }

/** 下次复查日期：最近一条复查记录的 nextDate，没有记录时用 settings.recheckDate */
export function nextRecheckDate(d: AppData, today: string): string | null {
  return latest(d.visits, today)?.nextDate || d.settings.recheckDate
}

/** 由当前数据计算提醒列表，按 red、yellow、gray 排序（spec §6） */
export function computeAlerts(d: AppData, today: string, env: { persistent: boolean; speech: boolean }): Alert[] {
  const out: Alert[] = []
  const add = (id: string, level: AlertLevel, text: string, to: string) => out.push({ id, level, text, to })

  // 复查
  const next = nextRecheckDate(d, today)
  if (next) {
    const n = daysBetween(today, next)
    if (n < 0) add('recheck-overdue', 'red', `复查日期（${next}）已过 ${-n} 天，建议尽快安排复查`, '/parent/visits')
    else if (n === 0) add('recheck-soon', 'yellow', '今天是复查日', '/parent/visits')
    else if (n <= 14) add('recheck-soon', 'yellow', `距下次复查还有 ${n} 天（${next}）`, '/parent/visits')
  }

  // 视力自测
  const recheck = needsRecheck(d.acuityTests, today)
  if (recheck === 'see-doctor')
    add('acuity-doctor', 'red', '近 14 天内两次视力自测结果都有异常，建议近期带孩子去医院复查', '/parent/acuity')
  else if (recheck === 'retest')
    add('acuity-retest', 'yellow', '上次视力自测结果需要再确认，建议 1 周内重测一次', '/parent/acuity')
  const lastTest = latest(d.acuityTests, today)
  if (!lastTest) add('acuity-due', 'gray', '还没有做过视力自测，建议每 2–4 周测一次', '/parent/acuity')
  else if (daysBetween(lastTest.date, today) > 28)
    add('acuity-due', 'gray', `距上次视力自测已 ${daysBetween(lastTest.date, today)} 天，建议测一次`, '/parent/acuity')

  // 观察清单
  const lastCheck = latest(d.checklists, today)
  const checkAge = lastCheck ? daysBetween(lastCheck.date, today) : Infinity
  if (lastCheck && checkAge <= 30 && checklistFindings(lastCheck).key.length)
    add('checklist-key', 'red', '观察清单中出现需要留意的信号，建议近期咨询医生', '/parent/observe')
  if (!lastCheck) add('checklist-due', 'gray', '还没有填过观察清单，每月填一次约 2 分钟', '/parent/observe')
  else if (checkAge > 30) add('checklist-due', 'gray', `距上次观察清单已 ${checkAge} 天，建议填一次`, '/parent/observe')

  // 戴镜
  // 只有戴镜记录跨度满 7 天（最早一条在 6 天前或更早）才判断，避免刚开始使用就提醒
  const wearDates = Object.keys(d.days).filter(k => k <= today && d.days[k]?.wear)
  const earliest = wearDates.length ? wearDates.reduce((a, b) => (a < b ? a : b)) : null
  const good = weekGoodCount(d.days, today)
  if (earliest && earliest <= addDays(today, -6) && good < 5) add('wear-low', 'yellow', `近 7 天戴镜达标 ${good}/7 天，坚持戴镜最重要`, '/parent/checkin')

  // 备份（lastBackupAt 取前 10 位，兼容 YYYY-MM-DD 与 ISO 时间戳）
  const backup = d.meta.lastBackupAt?.slice(0, 10)
  if (!backup) add('backup-due', 'gray', '还没有导出过备份，建议导出一份保存', '/parent/settings')
  else if (daysBetween(backup, today) > 30) add('backup-due', 'gray', '已超过 30 天没有备份，建议导出一份', '/parent/settings')

  // 校准与环境
  if (d.calibration.pxPerMm === null) add('calibration', 'gray', '尚未做屏幕校准，视标尺寸可能不准', '/parent/calibration')
  if (!env.persistent) add('storage', 'gray', '本地存储不可用，关闭页面后记录会丢失', '/parent/settings')
  if (!env.speech) add('speech', 'gray', '当前浏览器不支持语音播报', '/parent/settings')

  return out.sort((a, b) => ORDER[a.level] - ORDER[b.level])
}
