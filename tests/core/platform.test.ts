import { describe, it, expect } from 'vitest'
import { needsAddToHome } from '../../src/core/platform'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
const no = () => false

describe('needsAddToHome', () => {
  it('iPhone Safari 浏览器内 → 需要引导', () => {
    expect(needsAddToHome({ userAgent: IPHONE }, no)).toBe(true)
  })
  it('iPadOS 桌面 UA 也识别为 iOS', () => {
    expect(needsAddToHome({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 }, no)).toBe(true)
    expect(needsAddToHome({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0 }, no)).toBe(false)
  })
  it('从主屏幕打开（standalone）→ 不需要', () => {
    expect(needsAddToHome({ userAgent: IPHONE, standalone: true }, no)).toBe(false)
    expect(needsAddToHome({ userAgent: IPHONE }, q => q === '(display-mode: standalone)')).toBe(false)
  })
  it('非 iOS → 不需要', () => {
    expect(needsAddToHome({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120' }, no)).toBe(false)
    expect(needsAddToHome(undefined, no)).toBe(false)
  })
})
