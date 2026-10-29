export const CARD_WIDTH_MM = 85.6
/** CSS 规范 96px/inch；移动设备实际偏大，未校准时仅作粗略估计 */
export const DEFAULT_PX_PER_MM = 96 / 25.4

export function arcminToMm(arcmin: number, distanceMm: number): number {
  const rad = (arcmin / 60) * (Math.PI / 180)
  return 2 * distanceMm * Math.tan(rad / 2)
}

export function arcminToPx(arcmin: number, distanceMm: number, pxPerMm: number | null): number {
  return arcminToMm(arcmin, distanceMm) * (pxPerMm ?? DEFAULT_PX_PER_MM)
}

export function pxPerMmFromCard(cardWidthPx: number): number {
  return cardWidthPx / CARD_WIDTH_MM
}

/** 每度视角对应的像素，用于空间频率（c/deg）换算 */
export function pxPerDegree(distanceMm: number, pxPerMm: number | null): number {
  return arcminToPx(60, distanceMm, pxPerMm)
}
