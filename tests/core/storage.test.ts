import { describe, it, expect } from 'vitest'
import { createStorage, defaultData, STORAGE_KEY } from '../../src/core/storage'

function fakeBackend() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }
}

describe('storage', () => {
  it('无数据时返回默认值', () => {
    const s = createStorage(fakeBackend())
    expect(s.load()).toEqual(defaultData())
  })
  it('保存后可读回', () => {
    const b = fakeBackend(); const s = createStorage(b)
    const d = defaultData(); d.profile.nickname = '小明'
    s.save(d)
    expect(createStorage(b).load().profile.nickname).toBe('小明')
  })
  it('后端抛错时退回内存并标记 persistent=false', () => {
    const bad = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => {} }
    const s = createStorage(bad)
    expect(s.persistent).toBe(false)
    const d = defaultData(); d.stickers.push('a'); s.save(d)
    expect(s.load().stickers).toEqual(['a'])
  })
  it('损坏的 JSON 会备份并重置', () => {
    const b = fakeBackend(); b.setItem(STORAGE_KEY, '{oops')
    const s = createStorage(b)
    expect(s.load()).toEqual(defaultData())
    expect([...b.m.keys()].some(k => k.startsWith(STORAGE_KEY + '.backup'))).toBe(true)
  })
  it('版本号不同会迁移并补齐缺失字段', () => {
    const b = fakeBackend(); b.setItem(STORAGE_KEY, JSON.stringify({ version: 0, stickers: ['x'] }))
    const d = createStorage(b).load()
    expect(d.version).toBe(1)
    expect(d.stickers).toEqual(['x'])
    expect(d.settings.dailyLimitMin).toBe(12)
  })
})
