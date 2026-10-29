import type { Checklist } from './storage'

/** 每月观察清单（spec §4.1）；key = 重点信号 */
export const CHECK_ITEMS: { id: string; text: string; key: boolean }[] = [
  { id: 'eso-off', text: '摘掉眼镜时，眼睛有没有往内偏（对眼）？', key: true },
  { id: 'eso-on', text: '戴着眼镜时，眼睛有没有偏斜？', key: true },
  { id: 'squint', text: '看东西时眯眼、歪头或侧着脸看？', key: false },
  { id: 'rub', text: '经常揉眼睛或说眼睛累？', key: false },
  { id: 'close', text: '看书、看图时凑得很近？', key: false },
  { id: 'one-eye', text: '闭上或挡住一只眼才看东西？', key: true },
  { id: 'refuse', text: '不愿意戴眼镜，或者摘镜后更愿意看近处？', key: false },
  { id: 'clumsy', text: '走路容易磕碰、拿东西够不准？', key: false },
]

/** key：重点项为"有时 / 经常"；often：其他项为"经常" */
export function checklistFindings(c: Checklist): { key: string[]; often: string[] } {
  const key: string[] = [], often: string[] = []
  for (const it of CHECK_ITEMS) {
    const a = c.answers[it.id]
    if (it.key && (a === 'sometimes' || a === 'often')) key.push(it.id)
    else if (!it.key && a === 'often') often.push(it.id)
  }
  return { key, often }
}
