// 青蛙跳荷叶：荷叶按行从左到右排开，小青蛙像读书一样一片片往右跳，跳完一行换到下一行最左边。
export const MAX_LEVEL = 14
export const padsPerRow = (lv: number) => Math.min(8, 3 + Math.floor(lv / 2))
export const rowCount = (lv: number) => (lv < 6 ? 1 : lv < 10 ? 2 : 3)
export const dwellMs = (lv: number) => Math.max(900, 2500 - lv * 130)
export const padArcmin = (lv: number) => 160 * Math.pow(0.93, lv)
/** 跳一次的时长（ms） */
export const HOP_MS = 400
/** 荷叶最小直径（px） */
export const MIN_PAD_PX = 48

export interface Pt { x: number; y: number }
export interface Pad extends Pt { row: number; col: number }
export interface PadLayout { pads: Pad[]; size: number; colW: number; rowH: number }

/**
 * 布局：荷叶按行主序编号（第 0 行从左到右，然后第 1 行……）。
 * size = 想要的直径（由角分换算），但不超过每格的 85%，且不小于 48px。
 */
export function layoutPads(lv: number, w: number, h: number, wantPx: number): PadLayout {
  const cols = padsPerRow(lv), rows = rowCount(lv)
  const colW = w / cols
  const rowH = h / rows
  const fit = Math.min(colW * 0.85, rowH * 0.7)
  const size = Math.max(MIN_PAD_PX, Math.min(wantPx, fit))
  const pads: Pad[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 竖直方向保证荷叶完整显示
      const y = Math.min(h - size / 2, Math.max(size / 2, rowH * (r + 0.5)))
      pads.push({ x: colW * (c + 0.5), y, row: r, col: c })
    }
  }
  return { pads, size, colW, rowH }
}

/** 下一片荷叶：编号就是阅读顺序，最后一片之后回到第一片 */
export const nextPad = (i: number, total: number) => (i + 1) % total

/** 跳跃弧线：p ∈ [0,1]，中间最高处向上拱起 lift 像素（抛物线） */
export function hopPos(a: Pt, b: Pt, p: number, lift: number): Pt {
  const t = Math.max(0, Math.min(1, p))
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - 4 * lift * t * (1 - t) }
}

/** 点击命中：落在哪一片荷叶的格子里（宽 = 列宽，高 ≥ 64px），没有返回 -1 */
export function hitPad(L: PadLayout, x: number, y: number): number {
  const halfW = L.colW / 2
  const halfH = Math.max(32, L.size / 2 + 8, Math.min(L.rowH / 2, L.size))
  let best = -1, bestD = Infinity
  L.pads.forEach((p, i) => {
    const dx = Math.abs(x - p.x), dy = Math.abs(y - p.y)
    if (dx > halfW || dy > halfH) return
    const d = Math.hypot(dx, dy)
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}

export type ThemeId = 'pond' | 'sky' | 'garden'
export const THEMES: ThemeId[] = ['pond', 'sky', 'garden']
