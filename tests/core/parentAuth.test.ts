import { describe, it, expect, beforeEach } from 'vitest'
import { isParentOk, markParentOk, clearParentOk, PARENT_OK_MS } from '../../src/core/parentAuth'

describe('parentAuth', () => {
  beforeEach(() => clearParentOk())
  it('未通过时无效', () => expect(isParentOk()).toBe(false))
  it('通过后 10 分钟内有效，之后失效', () => {
    markParentOk(1000)
    expect(isParentOk(1000 + PARENT_OK_MS - 1)).toBe(true)
    expect(isParentOk(1000 + PARENT_OK_MS)).toBe(false)
  })
})
