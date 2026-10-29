/** 月龄；只知道出生年月，按出生月 1 日计算，不满 1 个月不计 */
export function ageMonths(birthMonth: string | null, today: string): number | null {
  const b = /^(\d{4})-(\d{2})$/.exec(birthMonth ?? '')
  const t = /^(\d{4})-(\d{2})/.exec(today)
  if (!b || !t) return null
  const m = (+t[1] - +b[1]) * 12 + (+t[2] - +b[2])
  return m < 0 ? null : m
}

/** AAPOS 转诊参考线（单眼差于此 logMAR 时提示）；3 岁以下不使用 */
export function ageThresholdLogmar(months: number | null): number | null {
  if (months === null || months < 36) return null
  if (months < 48) return 0.4
  if (months < 60) return 0.3
  return 0.2
}

export const logmarToDecimal = (l: number) => +Math.pow(10, -l).toFixed(2)
