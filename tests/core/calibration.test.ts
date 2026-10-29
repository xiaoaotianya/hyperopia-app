import { describe, it, expect } from 'vitest'
import { arcminToMm, arcminToPx, CARD_WIDTH_MM, pxPerMmFromCard, DEFAULT_PX_PER_MM } from '../../src/core/calibration'

describe('calibration', () => {
  it('40cm 处 60 角分约 6.98mm', () => {
    expect(arcminToMm(60, 400)).toBeCloseTo(6.981, 2)
  })
  it('银行卡宽度换算 pxPerMm', () => {
    expect(pxPerMmFromCard(342.4)).toBeCloseTo(4, 5)
    expect(CARD_WIDTH_MM).toBe(85.6)
  })
  it('arcminToPx 未校准时用默认值', () => {
    expect(arcminToPx(60, 400, null)).toBeCloseTo(6.981 * DEFAULT_PX_PER_MM, 1)
  })
})
