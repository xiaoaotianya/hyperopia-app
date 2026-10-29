export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 用 UTC 计算，避免夏令时影响
const utc = (k: string) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d) }

export function addDays(k: string, n: number): string {
  const d = new Date(utc(k) + n * 86400000)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

/** b - a 的天数 */
export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86400000)
}
