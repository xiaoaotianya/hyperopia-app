import { type Rng } from '../../core/random'

export const MAX_LEVEL = 10
export const widthArcmin = (lv: number) => 300 * Math.pow(0.85, lv)
export const bends = (lv: number) => 1 + Math.floor(lv / 2)
export type Pt = { x: number; y: number }
/** 归一化折线，从左(0.08)到右(0.92) */
export function makePath(lv: number, rng: Rng): Pt[] {
  const n = bends(lv) + 1
  const pts: Pt[] = [{ x: 0.08, y: 0.5 }]
  for (let i = 1; i < n; i++) pts.push({ x: 0.08 + (0.84 * i) / n, y: 0.2 + rng() * 0.6 })
  pts.push({ x: 0.92, y: 0.5 })
  return pts
}
/** 点到线段 a-b 的最近点参数 t∈[0,1]；退化线段返回 0 */
function segParam(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return 0
  return Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
}
export function distToPolyline(p: Pt, pts: Pt[]): number {
  return nearestOnPolyline(p, pts).dist
}
/** 最近的线段序号、该线段上的参数和距离 */
export function nearestOnPolyline(p: Pt, pts: Pt[]): { seg: number; t: number; dist: number } {
  let best = { seg: 0, t: 0, dist: Infinity }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const t = segParam(p, a, b)
    const d = Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)))
    if (d < best.dist) best = { seg: i, t, dist: d }
  }
  return best
}
